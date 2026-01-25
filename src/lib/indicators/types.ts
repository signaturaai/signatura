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

// Indicator names for reference (universal for all industries)
export const INDICATOR_NAMES: Record<number, string> = {
  1: 'Job Knowledge & Professional Competence',
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

// Indicator categories
export const INDICATOR_CATEGORIES: Record<number, 'Cognitive' | 'Interpersonal' | 'Character'> = {
  1: 'Cognitive',
  2: 'Cognitive',
  3: 'Interpersonal',
  4: 'Interpersonal',
  5: 'Character',
  6: 'Character',
  7: 'Cognitive',
  8: 'Interpersonal',
  9: 'Cognitive',
  10: 'Character',
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

// Sub-indicator counts per indicator (total: 70)
export const SUB_INDICATOR_COUNTS: Record<number, number> = {
  1: 5,   // Job Knowledge & Professional Competence
  2: 5,   // Problem-Solving & Critical Thinking
  3: 5,   // Communication & Articulation
  4: 5,   // Social Skills & Interpersonal Ability
  5: 5,   // Integrity & Ethical Standards
  6: 5,   // Adaptability & Flexibility
  7: 5,   // Learning Agility & Growth Mindset
  8: 12,  // Leadership & Initiative (expanded)
  9: 8,   // Creativity & Innovation (expanded)
  10: 15, // Motivation & Drive (expanded)
}

// Complete sub-indicator definitions (70 total)
export const SUB_INDICATORS: Record<number, Array<{ name: string; description: string }>> = {
  // Indicator 1: Job Knowledge & Professional Competence (5)
  1: [
    { name: 'Domain Expertise', description: 'Deep understanding of field-specific principles, theories, and practices' },
    { name: 'Technical Skills', description: 'Proficiency in specialized skills required for the role' },
    { name: 'Tool/System Mastery', description: 'Proficiency with relevant tools, equipment, software, systems, or technologies' },
    { name: 'Industry Awareness', description: 'Knowledge of industry trends, market dynamics, regulatory environment, and competitive landscape' },
    { name: 'Continuous Learning', description: 'Staying updated with new developments, best practices, and advancements in the field' },
  ],

  // Indicator 2: Problem-Solving & Critical Thinking (5)
  2: [
    { name: 'Analytical Skills', description: 'Breaking down complex problems, gathering and interpreting data, identifying patterns' },
    { name: 'Decision Making', description: 'Making timely, well-reasoned choices, considering various factors and consequences' },
    { name: 'Strategic Thinking', description: 'Identifying long-term implications, aligning solutions with broader goals' },
    { name: 'Root Cause Analysis', description: 'Identifying underlying issues rather than just treating symptoms' },
    { name: 'Innovative Solutions', description: 'Developing creative or unconventional approaches to problems' },
  ],

  // Indicator 3: Communication & Articulation (5)
  3: [
    { name: 'Verbal Communication', description: 'Speaking clearly, concisely, and persuasively; adjusting message to audience' },
    { name: 'Written Communication', description: 'Writing clearly, concisely, and professionally across formats' },
    { name: 'Active Listening', description: 'Understanding others\' perspectives, asking clarifying questions' },
    { name: 'Presentation Skills', description: 'Engaging audiences, conveying information effectively' },
    { name: 'Cross-Cultural Communication', description: 'Communicating effectively with diverse cultural backgrounds' },
  ],

  // Indicator 4: Social Skills & Interpersonal Ability (5)
  4: [
    { name: 'Team Collaboration', description: 'Working effectively with colleagues, contributing to team goals' },
    { name: 'Conflict Resolution', description: 'Addressing disagreements constructively, finding common ground' },
    { name: 'Empathy & Emotional Intelligence', description: 'Understanding others\' feelings and perspectives' },
    { name: 'Networking & Relationship Building', description: 'Establishing and maintaining positive professional relationships' },
    { name: 'Customer/Client Focus', description: 'Understanding and addressing client needs, providing excellent service' },
  ],

  // Indicator 5: Integrity & Ethical Standards (5)
  5: [
    { name: 'Honesty & Transparency', description: 'Being truthful and open in all interactions' },
    { name: 'Confidentiality', description: 'Protecting sensitive information, adhering to privacy policies' },
    { name: 'Accountability', description: 'Taking responsibility for actions, admitting mistakes' },
    { name: 'Fairness & Respect', description: 'Treating all individuals equitably, upholding principles of justice' },
    { name: 'Ethical Decision Making', description: 'Consistently applying moral principles and professional codes' },
  ],

  // Indicator 6: Adaptability & Flexibility (5)
  6: [
    { name: 'Embracing Change', description: 'Openness to new ideas, methods, and technologies' },
    { name: 'Resilience', description: 'Maintaining composure and effectiveness under pressure' },
    { name: 'Multitasking & Prioritization', description: 'Managing multiple tasks efficiently, adjusting priorities' },
    { name: 'Learning New Skills', description: 'Quickly acquiring new knowledge or competencies' },
    { name: 'Cross-Functional Adaptability', description: 'Successfully transitioning between different roles, teams, or projects' },
  ],

  // Indicator 7: Learning Agility & Growth Mindset (5)
  7: [
    { name: 'Self-Reflection & Feedback Integration', description: 'Seeking feedback, reflecting on performance' },
    { name: 'Continuous Improvement', description: 'Proactively identifying areas for growth' },
    { name: 'Intellectual Curiosity', description: 'Genuine desire to learn, explore new ideas' },
    { name: 'Resourcefulness', description: 'Finding creative ways to acquire knowledge or solve problems' },
    { name: 'Application of Learning', description: 'Translating new knowledge into improved performance' },
  ],

  // Indicator 8: Leadership & Initiative (12) - EXPANDED
  8: [
    { name: 'Goal Setting & Vision', description: 'Defining clear objectives, inspiring others towards a shared vision' },
    { name: 'Team Motivation & Development', description: 'Inspiring others, recognizing contributions, developing capabilities' },
    { name: 'Ownership & Accountability', description: 'Taking responsibility for results, driving projects to completion' },
    { name: 'Strategic Thinking & Influence', description: 'Seeing big picture, anticipating challenges, persuading others' },
    { name: 'Delegating & Empowering', description: 'Effectively assigning tasks, trusting team members, fostering autonomy' },
    { name: 'Conflict Resolution (Leadership)', description: 'Mediating disputes within teams, addressing interpersonal issues' },
    { name: 'Change Management', description: 'Guiding teams through transitions, communicating rationale for change' },
    { name: 'Performance Management', description: 'Setting clear expectations, providing regular feedback' },
    { name: 'Crisis Management', description: 'Remaining calm during emergencies, making critical decisions under pressure' },
    { name: 'Mentorship & Coaching', description: 'Guiding and developing less experienced team members' },
    { name: 'Decisiveness', description: 'Making firm decisions in a timely manner' },
    { name: 'Problem Anticipation', description: 'Identifying potential issues before they arise' },
  ],

  // Indicator 9: Creativity & Innovation (8) - EXPANDED
  9: [
    { name: 'Original Thinking', description: 'Generating unique ideas, approaches, or solutions' },
    { name: 'Experimentation & Risk-Taking', description: 'Willingness to try new methods, embrace ambiguity' },
    { name: 'Design Thinking', description: 'Human-centered approach to problem-solving' },
    { name: 'Implementation of Innovations', description: 'Turning creative ideas into practical reality' },
    { name: 'Divergent Thinking', description: 'Exploring multiple possibilities without premature judgment' },
    { name: 'Convergent Thinking', description: 'Systematically evaluating ideas to identify the most viable solution' },
    { name: 'Resource Optimization', description: 'Creative use of existing resources to achieve desired outcomes' },
    { name: 'Trend Spotting', description: 'Identifying emerging patterns or shifts' },
  ],

  // Indicator 10: Motivation & Drive (15) - EXPANDED
  10: [
    { name: 'Proactiveness & Initiative', description: 'Taking action without explicit direction, seeking opportunities' },
    { name: 'Persistence & Perseverance', description: 'Continuing efforts despite challenges, showing tenacity' },
    { name: 'Achievement Orientation', description: 'Setting high standards, striving for excellence' },
    { name: 'Work Ethic & Reliability', description: 'Demonstrating consistent effort, meeting deadlines' },
    { name: 'Self-Motivation', description: 'Driving oneself to accomplish tasks and goals' },
    { name: 'Enthusiasm & Engagement', description: 'Displaying positive attitude, genuine interest' },
    { name: 'Commitment to Quality', description: 'Ensuring high standards in all outputs' },
    { name: 'Goal Orientation', description: 'Focusing efforts on achieving specific objectives' },
    { name: 'Resilience to Failure', description: 'Viewing setbacks as learning opportunities' },
    { name: 'Professionalism', description: 'Exhibiting appropriate conduct and demeanor' },
    { name: 'Time Management', description: 'Organizing tasks effectively to meet deadlines' },
    { name: 'Self-Development', description: 'Actively seeking opportunities for growth' },
    { name: 'Passion for the Mission', description: 'Demonstrating alignment with organization\'s goals' },
    { name: 'Adaptability to Feedback', description: 'Openness to constructive criticism' },
    { name: 'Drive for Impact', description: 'Desire to make meaningful contributions' },
  ],
}

// Get sub-indicator count for an indicator
export function getSubIndicatorCount(indicatorNumber: number): number {
  return SUB_INDICATOR_COUNTS[indicatorNumber] || 5
}

// Get sub-indicators for an indicator
export function getSubIndicators(indicatorNumber: number): Array<{ name: string; description: string }> {
  return SUB_INDICATORS[indicatorNumber] || []
}

// Total sub-indicators count
export const TOTAL_SUB_INDICATORS = Object.values(SUB_INDICATOR_COUNTS).reduce((a, b) => a + b, 0) // 70
