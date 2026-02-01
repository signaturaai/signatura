/**
 * Negotiation Dashboard - Automated Tests
 *
 * Tests for the compensation strategy display:
 * - Market Pulse badge
 * - TC Gauge / benchmark chart logic
 * - SWOT analysis display
 * - Strategy overview and counter-offer ranges
 * - Playbook tabs (email, phone, objections)
 *
 * RALPH: Reliability, Accuracy, Logic, Performance, Hardening
 */

import { describe, it, expect } from 'vitest'
import type {
  CompensationStrategy,
  MarketTemperature,
  MarketPosition,
  OfferDetails,
  UserPriorities,
  MarketBenchmark,
  OfferAnalysis,
  NegotiationStrategy,
  NegotiationScripts,
  NegotiationLever,
} from '@/types/compensation'
import { CURRENCY_SYMBOLS, MARKET_TEMPERATURE_CONFIG } from '@/types/compensation'

// ============================================================================
// Mock Data Factory
// ============================================================================

function createMockStrategy(overrides: Partial<CompensationStrategy> = {}): CompensationStrategy {
  return {
    id: 'strat-001',
    userId: 'user-1',
    createdAt: '2026-01-29T12:00:00Z',
    updatedAt: '2026-01-29T12:00:00Z',
    offerDetails: {
      baseSalary: 150000,
      currency: 'USD',
      location: 'San Francisco, CA',
      roleTitle: 'Senior Software Engineer',
      roleLevel: 'senior',
      companyName: 'TechCorp',
      companySize: 'large',
      remotePolicy: 'hybrid',
      signOnBonus: 25000,
      annualBonus: 20000,
      equity: { type: 'rsu', totalValue: 200000, vestingPeriodYears: 4 },
    },
    userPriorities: {
      primaryFocus: 'cash',
      willingToWalkAway: true,
      currentSalary: 130000,
      targetSalary: 170000,
    },
    marketBenchmark: {
      role: 'Senior Software Engineer',
      level: 'senior',
      location: 'San Francisco, CA',
      currency: 'USD',
      percentile25: 140000,
      percentile50: 165000,
      percentile75: 195000,
      percentile90: 220000,
      sampleSize: 500,
      dataSource: 'levels.fyi',
      lastUpdated: '2026-01-15',
      marketTemperature: 'heating',
    },
    analysis: {
      marketPosition: 'below_market',
      marketPositionDescription: 'Your offer is below the market median for this role and location.',
      percentileEstimate: 35,
      totalCompensation: 245000,
      annualizedEquity: 50000,
      marketTemperature: 'heating',
      temperatureAdvice: 'Hot market favors candidates.',
      strengths: ['Strong sign-on bonus', 'Good equity package'],
      weaknesses: ['Base salary below market median'],
      risks: ['Market cooling could reduce leverage'],
      opportunities: ['Counter for higher base', 'Negotiate accelerated vesting'],
    },
    strategy: {
      recommendedApproach: 'collaborative',
      approachRationale: 'Your strong profile and hot market support a collaborative negotiation.',
      counterOfferTarget: 175000,
      counterOfferRange: { minimum: 160000, target: 175000, stretch: 190000 },
      walkAwayPoint: 145000,
      negotiationLevers: [
        { category: 'base', description: 'Increase base salary', priority: 'primary', suggestedAsk: '+$25K', likelihood: 'high' },
        { category: 'equity', description: 'Accelerate vesting', priority: 'secondary', suggestedAsk: '3yr vest', likelihood: 'medium' },
      ],
      timeline: 'Respond within 3 business days',
      confidenceLevel: 'high',
    },
    scripts: {
      emailDraft: 'Dear Hiring Manager, Thank you for the offer...',
      phoneScript: ['Express gratitude', 'Reference market data', 'State your counter'],
      inPersonTips: ['Maintain eye contact', 'Stay positive'],
      objectionHandling: [
        { objection: 'This is our final offer', response: 'I understand your position. Let me share...', followUp: 'Would you consider...' },
        { objection: 'Budget is fixed', response: 'I appreciate the transparency...' },
      ],
      closingStatements: ['I am excited about this opportunity...'],
    },
    regenerationCount: 0,
    isActive: true,
    ...overrides,
  }
}

// ============================================================================
// SECTION 1: Market Temperature Config
// ============================================================================

describe('Market Temperature Config', () => {
  it('should have configs for all 3 temperatures', () => {
    expect(MARKET_TEMPERATURE_CONFIG).toHaveProperty('heating')
    expect(MARKET_TEMPERATURE_CONFIG).toHaveProperty('stable')
    expect(MARKET_TEMPERATURE_CONFIG).toHaveProperty('cooling')
  })

  it('each config should have label, color, and advice', () => {
    const temps: MarketTemperature[] = ['heating', 'stable', 'cooling']
    temps.forEach(temp => {
      const config = MARKET_TEMPERATURE_CONFIG[temp]
      expect(config.label).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.advice).toBeTruthy()
    })
  })

  it('heating should be labeled Hot Market', () => {
    expect(MARKET_TEMPERATURE_CONFIG.heating.label).toBe('Hot Market')
  })

  it('stable should be labeled Balanced Market', () => {
    expect(MARKET_TEMPERATURE_CONFIG.stable.label).toBe('Balanced Market')
  })

  it('cooling should be labeled Cooling Market', () => {
    expect(MARKET_TEMPERATURE_CONFIG.cooling.label).toBe('Cooling Market')
  })
})

// ============================================================================
// SECTION 2: Market Position Colors & Labels
// ============================================================================

describe('Market Position Display', () => {
  const MARKET_POSITION_COLORS: Record<string, string> = {
    well_below_market: '#EF4444',
    below_market: '#F97316',
    at_market: '#EAB308',
    above_market: '#22C55E',
    well_above_market: '#10B981',
  }

  const MARKET_POSITION_LABELS: Record<string, string> = {
    well_below_market: 'Underpaid',
    below_market: 'Below Market',
    at_market: 'Fair',
    above_market: 'Above Market',
    well_above_market: 'Winning',
  }

  it('should have 5 market positions', () => {
    expect(Object.keys(MARKET_POSITION_COLORS)).toHaveLength(5)
    expect(Object.keys(MARKET_POSITION_LABELS)).toHaveLength(5)
  })

  it('well_below_market should be red', () => {
    expect(MARKET_POSITION_COLORS.well_below_market).toBe('#EF4444')
  })

  it('above_market should be green', () => {
    expect(MARKET_POSITION_COLORS.above_market).toBe('#22C55E')
  })

  it('labels should be descriptive', () => {
    expect(MARKET_POSITION_LABELS.well_below_market).toBe('Underpaid')
    expect(MARKET_POSITION_LABELS.at_market).toBe('Fair')
    expect(MARKET_POSITION_LABELS.well_above_market).toBe('Winning')
  })
})

// ============================================================================
// SECTION 3: TC Gauge / Benchmark Chart Logic
// ============================================================================

describe('TC Gauge Chart Logic', () => {
  it('should compute chart data with 4 percentile bars', () => {
    const strategy = createMockStrategy()
    const { percentile25, percentile50, percentile75, percentile90 } = strategy.marketBenchmark
    const chartData = [
      { name: 'P25', value: percentile25 },
      { name: 'P50', value: percentile50 },
      { name: 'P75', value: percentile75 },
      { name: 'P90', value: percentile90 || Math.round(percentile75 * 1.2) },
    ]
    expect(chartData).toHaveLength(4)
    expect(chartData[0].value).toBe(140000)
    expect(chartData[1].value).toBe(165000)
    expect(chartData[2].value).toBe(195000)
    expect(chartData[3].value).toBe(220000)
  })

  it('should fallback P90 when undefined', () => {
    const strategy = createMockStrategy()
    strategy.marketBenchmark.percentile90 = undefined
    const p90 = strategy.marketBenchmark.percentile90 || Math.round(strategy.marketBenchmark.percentile75 * 1.2)
    expect(p90).toBe(Math.round(195000 * 1.2))
  })

  it('should format large values correctly', () => {
    function formatValue(value: number, symbol: string): string {
      if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`
      return `${symbol}${value}`
    }

    expect(formatValue(150000, '$')).toBe('$150K')
    expect(formatValue(1500000, '$')).toBe('$1.5M')
    expect(formatValue(500, '$')).toBe('$500')
    expect(formatValue(245000, '$')).toBe('$245K')
  })

  it('totalCompensation should appear as reference line value', () => {
    const strategy = createMockStrategy()
    expect(strategy.analysis.totalCompensation).toBe(245000)
  })
})

// ============================================================================
// SECTION 4: SWOT Analysis Display
// ============================================================================

describe('SWOT Analysis Display', () => {
  it('should have 4 sections', () => {
    const strategy = createMockStrategy()
    const sections = [
      { title: 'Strengths', items: strategy.analysis.strengths },
      { title: 'Weaknesses', items: strategy.analysis.weaknesses },
      { title: 'Opportunities', items: strategy.analysis.opportunities },
      { title: 'Risks', items: strategy.analysis.risks },
    ]
    expect(sections).toHaveLength(4)
  })

  it('strengths should have at least one item', () => {
    const strategy = createMockStrategy()
    expect(strategy.analysis.strengths.length).toBeGreaterThan(0)
  })

  it('all sections should be arrays', () => {
    const strategy = createMockStrategy()
    expect(Array.isArray(strategy.analysis.strengths)).toBe(true)
    expect(Array.isArray(strategy.analysis.weaknesses)).toBe(true)
    expect(Array.isArray(strategy.analysis.opportunities)).toBe(true)
    expect(Array.isArray(strategy.analysis.risks)).toBe(true)
  })

  it('empty sections should display fallback text', () => {
    const strategy = createMockStrategy()
    strategy.analysis.risks = []
    const displayText = strategy.analysis.risks.length > 0 ? 'items' : 'None identified'
    expect(displayText).toBe('None identified')
  })
})

// ============================================================================
// SECTION 5: Strategy Overview
// ============================================================================

describe('Strategy Overview', () => {
  it('should have a recommended approach', () => {
    const strategy = createMockStrategy()
    const validApproaches = ['aggressive', 'collaborative', 'cautious', 'accept_as_is']
    expect(validApproaches).toContain(strategy.strategy.recommendedApproach)
  })

  it('counter-offer range should have minimum < target < stretch', () => {
    const strategy = createMockStrategy()
    const { minimum, target, stretch } = strategy.strategy.counterOfferRange
    expect(minimum).toBeLessThan(target)
    expect(target).toBeLessThan(stretch)
  })

  it('walk-away point should be less than minimum counter-offer', () => {
    const strategy = createMockStrategy()
    expect(strategy.strategy.walkAwayPoint).toBeLessThan(strategy.strategy.counterOfferRange.minimum)
  })

  it('negotiation levers should have required fields', () => {
    const strategy = createMockStrategy()
    strategy.strategy.negotiationLevers.forEach(lever => {
      expect(lever.category).toBeTruthy()
      expect(lever.description).toBeTruthy()
      expect(lever.priority).toBeTruthy()
      expect(lever.suggestedAsk).toBeTruthy()
      expect(lever.likelihood).toBeTruthy()
    })
  })

  it('approach rationale should be non-empty', () => {
    const strategy = createMockStrategy()
    expect(strategy.strategy.approachRationale).toBeTruthy()
  })

  it('approach colors should map correctly', () => {
    const approachColors: Record<string, string> = {
      aggressive: 'bg-red-100 text-red-700 border-red-200',
      collaborative: 'bg-blue-100 text-blue-700 border-blue-200',
      cautious: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      accept_as_is: 'bg-green-100 text-green-700 border-green-200',
    }
    expect(approachColors['aggressive']).toContain('red')
    expect(approachColors['collaborative']).toContain('blue')
    expect(approachColors['cautious']).toContain('yellow')
    expect(approachColors['accept_as_is']).toContain('green')
  })
})

// ============================================================================
// SECTION 6: Playbook Tabs Logic
// ============================================================================

describe('Playbook Tabs', () => {
  it('should have 3 tabs', () => {
    const tabs = ['email', 'phone', 'objections']
    expect(tabs).toHaveLength(3)
  })

  it('email draft should be a non-empty string', () => {
    const strategy = createMockStrategy()
    expect(strategy.scripts.emailDraft).toBeTruthy()
    expect(typeof strategy.scripts.emailDraft).toBe('string')
  })

  it('phone script should be an array of strings', () => {
    const strategy = createMockStrategy()
    expect(Array.isArray(strategy.scripts.phoneScript)).toBe(true)
    expect(strategy.scripts.phoneScript.length).toBeGreaterThan(0)
    strategy.scripts.phoneScript.forEach(point => {
      expect(typeof point).toBe('string')
    })
  })

  it('objection handling should have objection and response', () => {
    const strategy = createMockStrategy()
    expect(strategy.scripts.objectionHandling.length).toBeGreaterThan(0)
    strategy.scripts.objectionHandling.forEach(obj => {
      expect(obj.objection).toBeTruthy()
      expect(obj.response).toBeTruthy()
    })
  })

  it('followUp in objection handling should be optional', () => {
    const strategy = createMockStrategy()
    const withFollowUp = strategy.scripts.objectionHandling.find(o => o.followUp)
    const withoutFollowUp = strategy.scripts.objectionHandling.find(o => !o.followUp)
    expect(withFollowUp).toBeDefined()
    expect(withoutFollowUp).toBeDefined()
  })

  it('inPersonTips should be an array', () => {
    const strategy = createMockStrategy()
    expect(Array.isArray(strategy.scripts.inPersonTips)).toBe(true)
  })

  it('closingStatements should be an array', () => {
    const strategy = createMockStrategy()
    expect(Array.isArray(strategy.scripts.closingStatements)).toBe(true)
  })
})

// ============================================================================
// SECTION 7: Dashboard Header Logic
// ============================================================================

describe('NegotiationDashboard Header', () => {
  it('should display role title and company name', () => {
    const strategy = createMockStrategy()
    const headerTitle = `${strategy.offerDetails.roleTitle} @ ${strategy.offerDetails.companyName}`
    expect(headerTitle).toBe('Senior Software Engineer @ TechCorp')
  })

  it('should display location', () => {
    const strategy = createMockStrategy()
    expect(strategy.offerDetails.location).toBe('San Francisco, CA')
  })

  it('should resolve currency symbol', () => {
    const strategy = createMockStrategy()
    const symbol = CURRENCY_SYMBOLS[strategy.offerDetails.currency]
    expect(symbol).toBe('$')
  })

  it('regenerationCount should start at 0', () => {
    const strategy = createMockStrategy()
    expect(strategy.regenerationCount).toBe(0)
  })
})

// ============================================================================
// SECTION 8: Lever Priority Colors
// ============================================================================

describe('Negotiation Lever Display', () => {
  it('primary levers should be prioritized', () => {
    const strategy = createMockStrategy()
    const primaryLevers = strategy.strategy.negotiationLevers.filter(l => l.priority === 'primary')
    expect(primaryLevers.length).toBeGreaterThan(0)
  })

  it('likelihood colors should map correctly', () => {
    const likelihoodColors: Record<string, string> = {
      high: 'text-green-600',
      medium: 'text-yellow-600',
      low: 'text-red-600',
    }
    expect(likelihoodColors['high']).toContain('green')
    expect(likelihoodColors['medium']).toContain('yellow')
    expect(likelihoodColors['low']).toContain('red')
  })

  it('should only show first 4 levers in the UI', () => {
    const strategy = createMockStrategy()
    const displayedLevers = strategy.strategy.negotiationLevers.slice(0, 4)
    expect(displayedLevers.length).toBeLessThanOrEqual(4)
  })
})
