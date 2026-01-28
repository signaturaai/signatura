/**
 * Compensation Negotiator - Strategy Generation
 *
 * Module 4: Backend logic for offer analysis and negotiation strategy generation.
 * Includes market data simulation, TC calculation, and LLM-powered strategy creation.
 */

import { randomUUID } from 'crypto'
import OpenAI from 'openai'
import {
  type OfferDetails,
  type UserPriorities,
  type MarketBenchmark,
  type OfferAnalysis,
  type NegotiationStrategy,
  type NegotiationScripts,
  type CompensationStrategy,
  type MarketTemperature,
  type MarketPosition,
  type RoleLevel,
  type Currency,
  MARKET_TEMPERATURE_CONFIG,
} from '@/types/compensation'

// ==========================================
// Market Data Simulation
// ==========================================

/**
 * Simulated market data by role level and location
 * Returns realistic salary benchmarks for MVP
 */
const MARKET_DATA: Record<
  RoleLevel,
  Record<string, { p25: number; p50: number; p75: number; p90: number }>
> = {
  intern: {
    default: { p25: 45000, p50: 55000, p75: 65000, p90: 80000 },
    'san francisco': { p25: 60000, p50: 75000, p75: 90000, p90: 110000 },
    'new york': { p25: 55000, p50: 70000, p75: 85000, p90: 100000 },
    london: { p25: 35000, p50: 45000, p75: 55000, p90: 70000 },
    'tel aviv': { p25: 30000, p50: 40000, p75: 50000, p90: 65000 },
  },
  junior: {
    default: { p25: 70000, p50: 85000, p75: 100000, p90: 120000 },
    'san francisco': { p25: 100000, p50: 120000, p75: 140000, p90: 165000 },
    'new york': { p25: 90000, p50: 110000, p75: 130000, p90: 150000 },
    london: { p25: 50000, p50: 65000, p75: 80000, p90: 95000 },
    'tel aviv': { p25: 45000, p50: 60000, p75: 75000, p90: 90000 },
  },
  mid: {
    default: { p25: 100000, p50: 120000, p75: 145000, p90: 170000 },
    'san francisco': { p25: 140000, p50: 170000, p75: 200000, p90: 235000 },
    'new york': { p25: 130000, p50: 155000, p75: 185000, p90: 215000 },
    london: { p25: 70000, p50: 90000, p75: 110000, p90: 135000 },
    'tel aviv': { p25: 65000, p50: 85000, p75: 105000, p90: 130000 },
  },
  senior: {
    default: { p25: 140000, p50: 170000, p75: 200000, p90: 240000 },
    'san francisco': { p25: 190000, p50: 230000, p75: 280000, p90: 330000 },
    'new york': { p25: 175000, p50: 210000, p75: 255000, p90: 300000 },
    london: { p25: 95000, p50: 120000, p75: 150000, p90: 185000 },
    'tel aviv': { p25: 90000, p50: 115000, p75: 145000, p90: 175000 },
  },
  staff: {
    default: { p25: 180000, p50: 220000, p75: 270000, p90: 320000 },
    'san francisco': { p25: 250000, p50: 310000, p75: 380000, p90: 450000 },
    'new york': { p25: 230000, p50: 285000, p75: 345000, p90: 410000 },
    london: { p25: 130000, p50: 165000, p75: 205000, p90: 250000 },
    'tel aviv': { p25: 120000, p50: 155000, p75: 195000, p90: 240000 },
  },
  principal: {
    default: { p25: 220000, p50: 280000, p75: 350000, p90: 420000 },
    'san francisco': { p25: 320000, p50: 400000, p75: 490000, p90: 580000 },
    'new york': { p25: 290000, p50: 365000, p75: 445000, p90: 530000 },
    london: { p25: 160000, p50: 210000, p75: 265000, p90: 325000 },
    'tel aviv': { p25: 150000, p50: 195000, p75: 250000, p90: 310000 },
  },
  director: {
    default: { p25: 250000, p50: 320000, p75: 400000, p90: 500000 },
    'san francisco': { p25: 360000, p50: 450000, p75: 560000, p90: 700000 },
    'new york': { p25: 330000, p50: 410000, p75: 510000, p90: 640000 },
    london: { p25: 180000, p50: 240000, p75: 310000, p90: 390000 },
    'tel aviv': { p25: 170000, p50: 225000, p75: 290000, p90: 365000 },
  },
  vp: {
    default: { p25: 300000, p50: 400000, p75: 520000, p90: 650000 },
    'san francisco': { p25: 420000, p50: 550000, p75: 700000, p90: 880000 },
    'new york': { p25: 380000, p50: 500000, p75: 640000, p90: 800000 },
    london: { p25: 220000, p50: 300000, p75: 400000, p90: 510000 },
    'tel aviv': { p25: 200000, p50: 280000, p75: 370000, p90: 470000 },
  },
  executive: {
    default: { p25: 400000, p50: 550000, p75: 750000, p90: 1000000 },
    'san francisco': { p25: 550000, p50: 750000, p75: 1000000, p90: 1400000 },
    'new york': { p25: 500000, p50: 680000, p75: 920000, p90: 1250000 },
    london: { p25: 300000, p50: 420000, p75: 580000, p90: 780000 },
    'tel aviv': { p25: 280000, p50: 390000, p75: 540000, p90: 720000 },
  },
}

/**
 * Market temperature by industry and location
 */
const MARKET_TEMPERATURES: Record<string, MarketTemperature> = {
  'tech_san francisco': 'stable',
  'tech_new york': 'stable',
  tech_london: 'cooling',
  'tech_tel aviv': 'heating',
  tech_default: 'stable',
  finance_default: 'stable',
  healthcare_default: 'heating',
  retail_default: 'cooling',
  default: 'stable',
}

/**
 * Fetch simulated market data for a given role and location
 */
export function fetchMarketData(
  role: string,
  level: RoleLevel,
  location: string,
  currency: Currency,
  industry?: string
): MarketBenchmark {
  // Normalize location for lookup
  const normalizedLocation = location.toLowerCase().trim()
  const locationKey =
    Object.keys(MARKET_DATA[level]).find((key) =>
      normalizedLocation.includes(key)
    ) || 'default'

  const data = MARKET_DATA[level][locationKey]

  // Determine market temperature
  const industryKey = industry?.toLowerCase() || 'tech'
  const tempKey =
    `${industryKey}_${locationKey}` in MARKET_TEMPERATURES
      ? `${industryKey}_${locationKey}`
      : `${industryKey}_default` in MARKET_TEMPERATURES
        ? `${industryKey}_default`
        : 'default'

  const temperature = MARKET_TEMPERATURES[tempKey]
  const tempConfig = MARKET_TEMPERATURE_CONFIG[temperature]

  // Apply currency conversion factor (simplified)
  const conversionFactors: Record<Currency, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    ILS: 3.7,
    CAD: 1.36,
    AUD: 1.53,
  }
  const factor = conversionFactors[currency]

  return {
    role,
    level,
    location,
    currency,
    percentile25: Math.round(data.p25 * factor),
    percentile50: Math.round(data.p50 * factor),
    percentile75: Math.round(data.p75 * factor),
    percentile90: Math.round(data.p90 * factor),
    sampleSize: Math.floor(Math.random() * 500) + 200,
    dataSource: 'Signatura Market Intelligence (Simulated)',
    lastUpdated: new Date().toISOString().split('T')[0],
    marketTemperature: temperature,
    temperatureReason: tempConfig.advice,
    yoyChange:
      temperature === 'heating' ? 8.5 : temperature === 'cooling' ? -3.2 : 2.1,
  }
}

// ==========================================
// Total Compensation Calculation
// ==========================================

/**
 * Calculate annualized total compensation
 * TC = Base + Bonus + (Equity / Vesting Years)
 */
export function calculateTotalCompensation(offer: OfferDetails): number {
  const base = offer.baseSalary
  const bonus = offer.annualBonus || (offer.bonusTarget || 0) * base / 100

  let annualizedEquity = 0
  if (offer.equity && offer.equity.type !== 'none' && offer.equity.totalValue) {
    const vestingYears = offer.equity.vestingPeriodYears || 4
    annualizedEquity = offer.equity.totalValue / vestingYears
  }

  return base + bonus + annualizedEquity
}

/**
 * Calculate just the annualized equity portion
 */
export function calculateAnnualizedEquity(offer: OfferDetails): number {
  if (!offer.equity || offer.equity.type === 'none' || !offer.equity.totalValue) {
    return 0
  }
  const vestingYears = offer.equity.vestingPeriodYears || 4
  return offer.equity.totalValue / vestingYears
}

// ==========================================
// Offer Analysis
// ==========================================

/**
 * Determine market position based on offer vs benchmark
 */
function determineMarketPosition(
  totalComp: number,
  benchmark: MarketBenchmark
): { position: MarketPosition; percentile: number; description: string } {
  const { percentile25, percentile50, percentile75 } = benchmark
  // Fallback to 120% of P75 if P90 not provided
  const percentile90 = benchmark.percentile90 ?? Math.round(percentile75 * 1.2)

  if (totalComp < percentile25 * 0.9) {
    return {
      position: 'well_below_market',
      percentile: Math.round((totalComp / percentile25) * 25),
      description:
        'This offer is significantly below market rate. Strong negotiation recommended.',
    }
  } else if (totalComp < percentile50) {
    const pct = 25 + ((totalComp - percentile25) / (percentile50 - percentile25)) * 25
    return {
      position: 'below_market',
      percentile: Math.round(pct),
      description:
        'This offer is below the median market rate. There is room for negotiation.',
    }
  } else if (totalComp < percentile75) {
    const pct = 50 + ((totalComp - percentile50) / (percentile75 - percentile50)) * 25
    return {
      position: 'at_market',
      percentile: Math.round(pct),
      description:
        'This offer is competitive and at market rate. Targeted improvements possible.',
    }
  } else if (totalComp < percentile90) {
    const pct = 75 + ((totalComp - percentile75) / (percentile90 - percentile75)) * 15
    return {
      position: 'above_market',
      percentile: Math.round(pct),
      description:
        'This is a strong offer above market median. Focus on specific priorities.',
    }
  } else {
    return {
      position: 'well_above_market',
      percentile: Math.min(99, Math.round(90 + (totalComp - percentile90) / percentile90 * 10)),
      description:
        'Exceptional offer well above market. Consider non-monetary factors.',
    }
  }
}

/**
 * Analyze offer against market benchmark and user priorities
 */
export function analyzeOffer(
  offer: OfferDetails,
  benchmark: MarketBenchmark,
  priorities: UserPriorities
): OfferAnalysis {
  const totalComp = calculateTotalCompensation(offer)
  const annualizedEquity = calculateAnnualizedEquity(offer)
  const { position, percentile, description } = determineMarketPosition(
    totalComp,
    benchmark
  )

  const strengths: string[] = []
  const weaknesses: string[] = []
  const risks: string[] = []
  const opportunities: string[] = []

  // Analyze compensation components
  if (offer.baseSalary >= benchmark.percentile50) {
    strengths.push('Base salary at or above market median')
  } else {
    weaknesses.push('Base salary below market median')
    opportunities.push('Negotiate base salary increase')
  }

  if (offer.signOnBonus && offer.signOnBonus > 0) {
    strengths.push(`Sign-on bonus of ${offer.signOnBonus.toLocaleString()} included`)
  } else {
    opportunities.push('Request sign-on bonus to bridge compensation gap')
  }

  if (offer.equity && offer.equity.type !== 'none' && offer.equity.totalValue) {
    strengths.push(`Equity package worth ${offer.equity.totalValue.toLocaleString()} over vesting period`)
    if (offer.equity.type === 'options') {
      risks.push('Options value depends on company growth and exit')
    }
  } else {
    weaknesses.push('No equity component in offer')
    opportunities.push('Request equity or RSU grant')
  }

  // Analyze based on user priorities
  if (priorities.primaryFocus === 'cash' && offer.baseSalary < benchmark.percentile75) {
    opportunities.push('Push for higher base salary given cash priority')
  }

  if (priorities.primaryFocus === 'equity' && (!offer.equity || offer.equity.type === 'none')) {
    weaknesses.push('No equity despite equity being top priority')
  }

  if (priorities.primaryFocus === 'wlb') {
    if (offer.remotePolicy === 'remote') {
      strengths.push('Remote work policy supports work-life balance')
    } else if (offer.remotePolicy === 'onsite') {
      weaknesses.push('On-site requirement may impact work-life balance')
      opportunities.push('Negotiate hybrid or remote work arrangement')
    }
  }

  // Company size considerations
  if (offer.companySize === 'startup') {
    risks.push('Startup environment carries higher risk')
    if (offer.equity?.type === 'options') {
      opportunities.push('Negotiate for more equity given startup risk')
    }
  }

  // Timeline considerations
  if (priorities.timeline) {
    risks.push(`Decision timeline: ${priorities.timeline}`)
  }

  // Temperature-based advice
  const tempConfig = MARKET_TEMPERATURE_CONFIG[benchmark.marketTemperature]

  return {
    marketPosition: position,
    marketPositionDescription: description,
    percentileEstimate: percentile,
    totalCompensation: totalComp,
    annualizedEquity,
    marketTemperature: benchmark.marketTemperature,
    temperatureAdvice: tempConfig.advice,
    strengths,
    weaknesses,
    risks,
    opportunities,
  }
}

// ==========================================
// LLM Strategy Generation
// ==========================================

const STRATEGY_SYSTEM_PROMPT = `You are an expert compensation negotiation coach helping candidates maximize their job offers.

Your role is to:
1. Analyze the offer details and market context
2. Develop a tailored negotiation strategy based on the candidate's priorities
3. Generate specific counter-offer recommendations
4. Create actionable scripts for different scenarios

Guidelines:
- Be specific and actionable in your advice
- Consider the candidate's stated priorities and deal-breakers
- Account for market conditions (hot, stable, cooling)
- Provide realistic ranges based on market data
- Include specific phrases and scripts the candidate can use
- Address likely objections from the employer
- Maintain a collaborative tone while being assertive

Output your response as a valid JSON object with the exact structure specified.`

interface StrategyGenerationInput {
  offer: OfferDetails
  priorities: UserPriorities
  benchmark: MarketBenchmark
  analysis: OfferAnalysis
}

/**
 * Generate negotiation strategy using LLM
 */
export async function generateStrategyWithLLM(
  input: StrategyGenerationInput
): Promise<{ strategy: NegotiationStrategy; scripts: NegotiationScripts }> {
  const openai = new OpenAI()

  const userPrompt = `
Generate a comprehensive negotiation strategy for this offer:

## Offer Details
- Company: ${input.offer.companyName} (${input.offer.companySize || 'Unknown size'})
- Role: ${input.offer.roleTitle} (${input.offer.roleLevel} level)
- Location: ${input.offer.location} (${input.offer.remotePolicy || 'Not specified'})
- Base Salary: ${input.offer.baseSalary.toLocaleString()} ${input.offer.currency}
- Sign-on Bonus: ${input.offer.signOnBonus?.toLocaleString() || 'None'} ${input.offer.currency}
- Annual Bonus: ${input.offer.annualBonus?.toLocaleString() || `${input.offer.bonusTarget || 0}% target`}
- Equity: ${input.offer.equity?.type !== 'none' ? `${input.offer.equity?.totalValue?.toLocaleString()} ${input.offer.currency} (${input.offer.equity?.type})` : 'None'}

## Market Context
- Market Position: ${input.analysis.marketPosition} (${input.analysis.percentileEstimate}th percentile)
- Market Temperature: ${input.benchmark.marketTemperature}
- P25/P50/P75: ${input.benchmark.percentile25.toLocaleString()} / ${input.benchmark.percentile50.toLocaleString()} / ${input.benchmark.percentile75.toLocaleString()}
- Total Comp Calculated: ${input.analysis.totalCompensation.toLocaleString()} ${input.offer.currency}

## Candidate Priorities
- Primary Focus: ${input.priorities.primaryFocus}
- Secondary Focus: ${input.priorities.secondaryFocus || 'Not specified'}
- Must Haves: ${input.priorities.mustHaves?.join(', ') || 'None specified'}
- Deal Breakers: ${input.priorities.dealBreakers?.join(', ') || 'None specified'}
- Willing to Walk Away: ${input.priorities.willingToWalkAway ? 'Yes' : 'No'}
- Current Salary: ${input.priorities.currentSalary?.toLocaleString() || 'Not disclosed'}
- Target Salary: ${input.priorities.targetSalary?.toLocaleString() || 'Not specified'}
- Timeline: ${input.priorities.timeline || 'Flexible'}

## Analysis Summary
Strengths: ${input.analysis.strengths.join('; ')}
Weaknesses: ${input.analysis.weaknesses.join('; ')}
Opportunities: ${input.analysis.opportunities.join('; ')}

Return a JSON object with this exact structure:
{
  "strategy": {
    "recommendedApproach": "aggressive" | "collaborative" | "cautious" | "accept_as_is",
    "approachRationale": "string explaining why this approach",
    "counterOfferTarget": number,
    "counterOfferRange": {
      "minimum": number,
      "target": number,
      "stretch": number
    },
    "walkAwayPoint": number,
    "negotiationLevers": [
      {
        "category": "base" | "bonus" | "equity" | "signing" | "benefits" | "title" | "start_date" | "other",
        "description": "string",
        "priority": "primary" | "secondary" | "fallback",
        "suggestedAsk": "string",
        "likelihood": "low" | "medium" | "high"
      }
    ],
    "timeline": "string with recommended negotiation timeline",
    "confidenceLevel": "low" | "medium" | "high"
  },
  "scripts": {
    "emailDraft": "Full email template for initial counter-offer",
    "phoneScript": ["Array of talking points for phone negotiation"],
    "inPersonTips": ["Array of tips for in-person negotiation"],
    "objectionHandling": [
      {
        "objection": "Common employer objection",
        "response": "How to respond",
        "followUp": "Optional follow-up question"
      }
    ],
    "closingStatements": ["Array of closing statements to seal the deal"]
  }
}

Important: Return ONLY the JSON object, no additional text.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.0,
    messages: [
      { role: 'system', content: STRATEGY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('No response from LLM')
  }

  const result = JSON.parse(content)
  return {
    strategy: result.strategy as NegotiationStrategy,
    scripts: result.scripts as NegotiationScripts,
  }
}

// ==========================================
// Main Strategy Generation Function
// ==========================================

/**
 * Generate complete compensation negotiation strategy
 */
export async function generateNegotiationStrategy(
  userId: string,
  offer: OfferDetails,
  priorities: UserPriorities,
  jobApplicationId?: string
): Promise<CompensationStrategy> {
  // 1. Fetch market benchmark data
  const benchmark = fetchMarketData(
    offer.roleTitle,
    offer.roleLevel,
    offer.location,
    offer.currency,
    offer.industry
  )

  // 2. Analyze offer against market
  const analysis = analyzeOffer(offer, benchmark, priorities)

  // 3. Generate strategy and scripts with LLM
  const { strategy, scripts } = await generateStrategyWithLLM({
    offer,
    priorities,
    benchmark,
    analysis,
  })

  // 4. Assemble complete strategy
  const now = new Date().toISOString()

  return {
    id: randomUUID(),
    userId,
    jobApplicationId,
    createdAt: now,
    updatedAt: now,
    offerDetails: offer,
    userPriorities: priorities,
    marketBenchmark: benchmark,
    analysis,
    strategy,
    scripts,
    regenerationCount: 0,
    isActive: true,
  }
}
