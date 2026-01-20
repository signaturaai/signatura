/**
 * Indicator Types
 *
 * Type definitions for the 10-Indicator Assessment Framework.
 * These types support ALL professions and industries.
 */

export interface Indicator {
  id: string
  number: number
  name: string
  category: 'Cognitive' | 'Interpersonal' | 'Character'
  description: string
  measurementMethods: string
  researchSupport: string
}

export interface SubIndicator {
  id: string
  indicatorId: string
  name: string
  description: string
  weight: number
}

export interface IndicatorScore {
  indicatorNumber: number
  indicatorName: string
  score: number // 1-10
  evidence: string // Specific quotes/examples from text
  suggestion: string // Actionable improvement suggestion
  subScores?: SubIndicatorScore[]
}

export interface SubIndicatorScore {
  name: string
  score: number
  evidence?: string
}

export interface IndicatorScores {
  scores: Record<number, IndicatorScore>
  overall: number // Weighted or simple average
  strengths: string[]
  gaps: string[]
  industry?: string
  context?: string
  timestamp: Date
}

export interface ScoreComparison {
  before: IndicatorScores
  after: IndicatorScores
  improvements: IndicatorDelta[]
  regressions: IndicatorDelta[]
  unchanged: number[]
  overallChange: number // Percentage change
  overallImprovement: boolean
  summary: string
}

export interface IndicatorDelta {
  indicatorNumber: number
  indicatorName: string
  beforeScore: number
  afterScore: number
  change: number
  percentChange: number
}

export interface Feedback {
  indicatorNumber: number
  indicatorName: string
  currentScore: number
  targetScore: number
  gap: number
  feedback: string
  actionItems: string[]
  examples?: string[]
}

export interface ScoringContext {
  type: 'cv' | 'interview' | 'job_description' | 'general'
  industry?: string
  role?: string
  seniorityLevel?: 'entry' | 'mid' | 'senior' | 'executive'
  specificIndicators?: number[] // If only scoring specific indicators
}

export interface ScoringResult {
  success: boolean
  scores?: IndicatorScores
  error?: string
  tokensUsed?: number
  model?: string
}

// Industry weight profile
export interface IndustryWeights {
  industry: string
  displayName: string
  weights: Record<number, number> // indicatorNumber -> weight (0-1, sum = 1)
  description: string
}

// Supported industries for weighted scoring
export type SupportedIndustry =
  | 'technology'
  | 'healthcare'
  | 'education'
  | 'retail'
  | 'finance'
  | 'manufacturing'
  | 'hospitality'
  | 'nonprofit'
  | 'government'
  | 'generic'

// Score thresholds for categorization
export const SCORE_THRESHOLDS = {
  exceptional: 9,
  strong: 7,
  adequate: 5,
  developing: 3,
  minimal: 1,
} as const

// Score labels for display
export const SCORE_LABELS: Record<number, string> = {
  10: 'Exceptional',
  9: 'Excellent',
  8: 'Very Good',
  7: 'Good',
  6: 'Above Average',
  5: 'Average',
  4: 'Below Average',
  3: 'Developing',
  2: 'Weak',
  1: 'Minimal',
}

// Color coding for scores
export const SCORE_COLORS = {
  high: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  low: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
} as const

export function getScoreColor(score: number) {
  if (score >= 7) return SCORE_COLORS.high
  if (score >= 5) return SCORE_COLORS.medium
  return SCORE_COLORS.low
}

export function getScoreLabel(score: number): string {
  const rounded = Math.round(score)
  return SCORE_LABELS[rounded] || 'Unknown'
}

// Indicator names for reference
export const INDICATOR_NAMES: Record<number, string> = {
  1: 'Job Knowledge & Technical Skills',
  2: 'Problem-Solving & Critical Thinking',
  3: 'Communication & Articulation',
  4: 'Social Skills & Interpersonal Ability',
  5: 'Integrity & Ethical Standards',
  6: 'Adaptability & Flexibility',
  7: 'Learning Agility & Growth Mindset',
  8: 'Leadership & Initiative',
  9: 'Creativity & Innovation',
  10: 'Motivation & Drive',
}

// Short names for UI display
export const INDICATOR_SHORT_NAMES: Record<number, string> = {
  1: 'Job Knowledge',
  2: 'Problem-Solving',
  3: 'Communication',
  4: 'Social Skills',
  5: 'Integrity',
  6: 'Adaptability',
  7: 'Learning Agility',
  8: 'Leadership',
  9: 'Creativity',
  10: 'Motivation',
}
