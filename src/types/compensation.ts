/**
 * Compensation Negotiator Types
 *
 * Types for Module 4: Compensation Negotiator
 * Handles offer analysis, market benchmarking, and negotiation strategy generation.
 */

// ==========================================
// Currency and Role Types
// ==========================================

export type Currency = 'USD' | 'EUR' | 'GBP' | 'ILS' | 'CAD' | 'AUD'

export type RoleLevel =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'director'
  | 'vp'
  | 'executive'

export type NegotiationPriority = 'cash' | 'equity' | 'wlb' | 'growth' | 'stability'

export type MarketTemperature = 'heating' | 'stable' | 'cooling'

export type MarketPosition =
  | 'well_below_market'
  | 'below_market'
  | 'at_market'
  | 'above_market'
  | 'well_above_market'

// ==========================================
// Offer Details
// ==========================================

export interface OfferDetails {
  baseSalary: number
  currency: Currency
  equity?: EquityDetails
  signOnBonus?: number
  annualBonus?: number
  bonusTarget?: number // Percentage of base
  benefits?: string
  location: string
  roleTitle: string
  roleLevel: RoleLevel
  companyName: string
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  industry?: string
  remotePolicy?: 'onsite' | 'hybrid' | 'remote'
}

export interface EquityDetails {
  type: 'rsu' | 'options' | 'phantom' | 'none'
  totalValue?: number
  numberOfShares?: number
  strikePrice?: number
  vestingSchedule?: string // e.g., "4 years, 1 year cliff"
  vestingPeriodYears?: number
}

// ==========================================
// User Priorities
// ==========================================

export interface UserPriorities {
  primaryFocus: NegotiationPriority
  secondaryFocus?: NegotiationPriority
  mustHaves?: string[]
  niceToHaves?: string[]
  dealBreakers?: string[]
  currentSalary?: number
  targetSalary?: number
  willingToWalkAway: boolean
  timeline?: string // e.g., "Need to decide within 1 week"
}

// ==========================================
// Market Benchmark Data
// ==========================================

export interface MarketBenchmark {
  role: string
  level: RoleLevel
  location: string
  currency: Currency
  percentile25: number
  percentile50: number
  percentile75: number
  percentile90?: number
  sampleSize?: number
  dataSource: string
  lastUpdated: string
  marketTemperature: MarketTemperature
  temperatureReason?: string
  yoyChange?: number // Year-over-year percentage change
}

// ==========================================
// Analysis Results
// ==========================================

export interface OfferAnalysis {
  marketPosition: MarketPosition
  marketPositionDescription: string
  percentileEstimate: number
  totalCompensation: number
  annualizedEquity: number
  marketTemperature: MarketTemperature
  temperatureAdvice: string
  strengths: string[]
  weaknesses: string[]
  risks: string[]
  opportunities: string[]
}

// ==========================================
// Negotiation Strategy
// ==========================================

export interface NegotiationStrategy {
  recommendedApproach: 'aggressive' | 'collaborative' | 'cautious' | 'accept_as_is'
  approachRationale: string
  counterOfferTarget: number
  counterOfferRange: {
    minimum: number
    target: number
    stretch: number
  }
  walkAwayPoint: number
  negotiationLevers: NegotiationLever[]
  timeline: string
  confidenceLevel: 'low' | 'medium' | 'high'
}

export interface NegotiationLever {
  category: 'base' | 'bonus' | 'equity' | 'signing' | 'benefits' | 'title' | 'start_date' | 'other'
  description: string
  priority: 'primary' | 'secondary' | 'fallback'
  suggestedAsk: string
  likelihood: 'low' | 'medium' | 'high'
}

// ==========================================
// Scripts and Templates
// ==========================================

export interface NegotiationScripts {
  emailDraft: string
  phoneScript: string[]
  inPersonTips: string[]
  objectionHandling: ObjectionResponse[]
  closingStatements: string[]
}

export interface ObjectionResponse {
  objection: string
  response: string
  followUp?: string
}

// ==========================================
// Complete Strategy Output
// ==========================================

export interface CompensationStrategy {
  id: string
  userId: string
  jobApplicationId?: string
  createdAt: string
  updatedAt: string

  // Input Data
  offerDetails: OfferDetails
  userPriorities: UserPriorities

  // Benchmark Data
  marketBenchmark: MarketBenchmark

  // Generated Analysis
  analysis: OfferAnalysis
  strategy: NegotiationStrategy
  scripts: NegotiationScripts

  // Metadata
  regenerationCount: number
  isActive: boolean
}

// ==========================================
// API Types
// ==========================================

export interface GenerateStrategyRequest {
  offerDetails: OfferDetails
  userPriorities: UserPriorities
  jobApplicationId?: string
}

export interface GenerateStrategyResponse {
  success: boolean
  strategy?: CompensationStrategy
  error?: string
}

// ==========================================
// Constants
// ==========================================

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
  CAD: 'C$',
  AUD: 'A$',
}

export const ROLE_LEVEL_LABELS: Record<RoleLevel, string> = {
  intern: 'Intern',
  junior: 'Junior / Entry Level',
  mid: 'Mid-Level',
  senior: 'Senior',
  staff: 'Staff / Lead',
  principal: 'Principal / Architect',
  director: 'Director',
  vp: 'VP / Head of',
  executive: 'C-Level / Executive',
}

export const PRIORITY_LABELS: Record<NegotiationPriority, string> = {
  cash: 'Maximize Cash Compensation',
  equity: 'Maximize Equity / Long-term Upside',
  wlb: 'Work-Life Balance & Flexibility',
  growth: 'Career Growth & Learning',
  stability: 'Job Security & Stability',
}

export const MARKET_TEMPERATURE_CONFIG: Record<
  MarketTemperature,
  { label: string; color: string; advice: string }
> = {
  heating: {
    label: 'Hot Market',
    color: 'text-red-600',
    advice: 'Candidates have leverage. Be confident in negotiations.',
  },
  stable: {
    label: 'Balanced Market',
    color: 'text-yellow-600',
    advice: 'Fair negotiations expected. Focus on your unique value.',
  },
  cooling: {
    label: 'Cooling Market',
    color: 'text-blue-600',
    advice: 'Employers have more leverage. Be strategic and flexible.',
  },
}
