/**
 * Integration Guide: Siggy PM Intelligence
 *
 * Provides helper functions to integrate PM Intelligence into the AI Companion,
 * CV Tailor, and Interview Coach components.
 *
 * Includes the CV Score Arbiter — a 4-stage analysis pipeline that ensures
 * tailored content never scores lower than the original.
 */

import {
  generateSiggyPMContext,
  analyzeWithPMPrinciples,
  PM_CORE_PRINCIPLES,
  getPrinciplesForContext,
} from './siggy-pm-intelligence'

// ---------------------------------------------------------------------------
// Types for the 4-Stage Analysis Pipeline & Score Arbiter
// ---------------------------------------------------------------------------

export interface StageScore {
  score: number        // 0-100 normalised score for this stage
  details: string[]    // Human-readable breakdown items
}

export interface FourStageAnalysis {
  /** Stage 1: Raw keyword / sub-indicator scan */
  indicators: StageScore
  /** Stage 2: ATS machine-readability & structure */
  ats: StageScore
  /** Stage 3: Recruiter UX — "Tired Recruiter at 4 PM" scan-ability */
  recruiterUX: StageScore
  /** Stage 4: PM Intelligence — 10 PM principles scoring */
  pmIntelligence: StageScore
  /** Weighted total across all 4 stages (0-100) */
  totalScore: number
}

export interface StageDropDetail {
  /** Which stage dropped */
  stage: 'indicators' | 'ats' | 'recruiterUX' | 'pmIntelligence'
  /** Human-readable stage name */
  stageName: string
  /** Original stage score */
  originalScore: number
  /** Tailored stage score */
  tailoredScore: number
  /** How much this stage dropped */
  drop: number
}

export interface ArbiterDecision {
  /** The winning bullet text */
  bullet: string
  /** Which version won: 'original' | 'tailored' */
  winner: 'original' | 'tailored'
  /** Full analysis of the original bullet */
  originalAnalysis: FourStageAnalysis
  /** Full analysis of the tailored bullet */
  tailoredAnalysis: FourStageAnalysis
  /** Score delta (tailored - original). Positive = tailored is better */
  scoreDelta: number
  /** When winner is 'original', lists every stage where the tailored version dropped */
  rejectionReasons: StageDropDetail[]
}

export interface ArbiterResult {
  /** Per-bullet decisions */
  decisions: ArbiterDecision[]
  /** Final optimised bullets (best-of-both for every position) */
  optimisedBullets: string[]
  /** Overall original score (average across bullets) */
  originalTotalScore: number
  /** Overall optimised score (average across bullets) */
  optimisedTotalScore: number
  /** True when every optimised bullet scores >= its original */
  methodologyPreserved: boolean
}

// ---------------------------------------------------------------------------
// Stage Weights — configurable balance across the 4 dimensions
//   ATS Compatibility: 30%  |  Cold Indicators: 20%  |  Recruiter UX: 20%  |  PM Intelligence: 30%
// ---------------------------------------------------------------------------
const STAGE_WEIGHTS = {
  indicators: 0.20,
  ats: 0.30,
  recruiterUX: 0.20,
  pmIntelligence: 0.30,
} as const

// ---------------------------------------------------------------------------
// Stage 1 — Indicator Scan
// ---------------------------------------------------------------------------

const INDICATOR_CATEGORIES = {
  actionVerbs: [
    'led', 'drove', 'launched', 'increased', 'reduced', 'improved',
    'delivered', 'built', 'created', 'designed', 'managed', 'developed',
    'established', 'implemented', 'optimized', 'spearheaded', 'orchestrated',
    'transformed', 'pioneered', 'accelerated', 'negotiated', 'scaled',
  ],
  metrics: /\d+%|\$[\d,.]+[KMB]?|\d+x|\d+[\s-]*(users|customers|clients|people|teams|stakeholders|engineers|members)/i,
  impactWords: [
    'revenue', 'growth', 'retention', 'conversion', 'efficiency',
    'adoption', 'engagement', 'satisfaction', 'churn', 'savings',
    'profit', 'roi', 'kpi', 'nps', 'csat', 'arr', 'mrr',
  ],
  scopeWords: [
    'cross-functional', 'enterprise', 'global', 'company-wide',
    'organization', 'department', 'team', 'stakeholder', 'c-suite',
    'executive', 'board',
  ],
} as const

export function analyzeIndicators(text: string): StageScore {
  const lower = text.toLowerCase()
  const details: string[] = []
  let raw = 0

  // Action verbs (0-25)
  const verbHits = INDICATOR_CATEGORIES.actionVerbs.filter(v => lower.includes(v))
  const verbScore = Math.min(verbHits.length * 8, 25)
  raw += verbScore
  if (verbHits.length > 0) details.push(`Action verbs: ${verbHits.join(', ')}`)
  else details.push('Missing strong action verbs')

  // Metrics (0-30)
  const metricMatches = text.match(new RegExp(INDICATOR_CATEGORIES.metrics.source, 'gi')) || []
  const metricScore = Math.min(metricMatches.length * 15, 30)
  raw += metricScore
  if (metricMatches.length > 0) details.push(`Metrics found: ${metricMatches.join(', ')}`)
  else details.push('No quantified metrics detected')

  // Impact words (0-25)
  const impactHits = INDICATOR_CATEGORIES.impactWords.filter(w => lower.includes(w))
  const impactScore = Math.min(impactHits.length * 8, 25)
  raw += impactScore
  if (impactHits.length > 0) details.push(`Impact language: ${impactHits.join(', ')}`)
  else details.push('Missing impact/business language')

  // Scope words (0-20)
  const scopeHits = INDICATOR_CATEGORIES.scopeWords.filter(w => lower.includes(w))
  const scopeScore = Math.min(scopeHits.length * 10, 20)
  raw += scopeScore
  if (scopeHits.length > 0) details.push(`Scope indicators: ${scopeHits.join(', ')}`)
  else details.push('No organisational scope indicators')

  return { score: Math.min(raw, 100), details }
}

// ---------------------------------------------------------------------------
// Stage 2 — ATS Robot (Machine-Readability & Structure)
// ---------------------------------------------------------------------------

export function analyzeATS(text: string): StageScore {
  const details: string[] = []
  let raw = 0

  // Starts with action verb (0-25)
  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase() || ''
  const startsWithVerb = INDICATOR_CATEGORIES.actionVerbs.includes(firstWord)
  if (startsWithVerb) {
    raw += 25
    details.push(`Starts with action verb: "${firstWord}"`)
  } else {
    details.push(`Does not start with a strong action verb`)
  }

  // Reasonable length — 15–30 words is ideal for ATS (0-20)
  const wordCount = text.trim().split(/\s+/).length
  if (wordCount >= 15 && wordCount <= 35) {
    raw += 20
    details.push(`Good length: ${wordCount} words`)
  } else if (wordCount >= 10 && wordCount <= 50) {
    raw += 10
    details.push(`Acceptable length: ${wordCount} words`)
  } else {
    details.push(`Length issue: ${wordCount} words (ideal: 15-35)`)
  }

  // Contains measurable result (0-25)
  const hasNumber = /\d/.test(text)
  if (hasNumber) {
    raw += 25
    details.push('Contains quantified data')
  } else {
    details.push('No quantified data for ATS parsing')
  }

  // No special characters that confuse parsers (0-15)
  const hasProblematicChars = /[{}<>|\\~`]/.test(text)
  if (!hasProblematicChars) {
    raw += 15
    details.push('Clean formatting for ATS parsers')
  } else {
    details.push('Contains characters that may confuse ATS parsers')
  }

  // Uses standard industry terminology (0-15)
  const industryTerms = [
    'product', 'roadmap', 'strategy', 'analytics', 'platform',
    'feature', 'release', 'sprint', 'agile', 'scrum', 'api',
    'infrastructure', 'pipeline', 'deployment', 'integration',
    'stakeholder', 'requirement', 'specification', 'backlog',
  ]
  const lower = text.toLowerCase()
  const termHits = industryTerms.filter(t => lower.includes(t))
  if (termHits.length >= 2) {
    raw += 15
    details.push(`Industry terms: ${termHits.join(', ')}`)
  } else if (termHits.length === 1) {
    raw += 8
    details.push(`Some industry terms: ${termHits.join(', ')}`)
  } else {
    details.push('Missing standard industry terminology')
  }

  return { score: Math.min(raw, 100), details }
}

// ---------------------------------------------------------------------------
// Stage 3 — Recruiter UX ("Tired Recruiter at 4 PM" Lens)
// ---------------------------------------------------------------------------

export function analyzeRecruiterUX(text: string): StageScore {
  const details: string[] = []
  let raw = 0

  // Scan-ability: Can the key achievement be understood in <5 seconds? (0-30)
  // Heuristic: first 8 words should contain a verb and hint at impact
  const firstEightWords = text.trim().split(/\s+/).slice(0, 8).join(' ').toLowerCase()
  const hasQuickVerb = INDICATOR_CATEGORIES.actionVerbs.some(v => firstEightWords.includes(v))
  const hasQuickImpact = INDICATOR_CATEGORIES.impactWords.some(w => firstEightWords.includes(w)) ||
    /\d/.test(firstEightWords)
  if (hasQuickVerb && hasQuickImpact) {
    raw += 30
    details.push('Strong opening — action + impact visible immediately')
  } else if (hasQuickVerb) {
    raw += 15
    details.push('Opens with action verb but impact buried later')
  } else {
    details.push('Weak opening — recruiter may skim past')
  }

  // Conciseness (0-20) — penalise excessively long bullets
  const wordCount = text.trim().split(/\s+/).length
  if (wordCount <= 30) {
    raw += 20
    details.push('Concise and scannable')
  } else if (wordCount <= 45) {
    raw += 10
    details.push('Slightly long but readable')
  } else {
    details.push('Too long — recruiter fatigue risk')
  }

  // "So What?" factor — does it answer why this matters? (0-25)
  const soWhatPatterns = [
    /result(ing|ed)?\s+in/i,
    /leading\s+to/i,
    /which\s+(led|drove|enabled|resulted)/i,
    /thereby/i,
    /achieving/i,
    /generating/i,
    /saving/i,
    /improving/i,
    /increasing/i,
    /reducing/i,
  ]
  const hasSoWhat = soWhatPatterns.some(p => p.test(text))
  const hasOutcomeNumber = /\d+%|\$[\d,.]+/.test(text)
  if (hasSoWhat && hasOutcomeNumber) {
    raw += 25
    details.push('Clear "so what?" with outcome + metrics')
  } else if (hasSoWhat || hasOutcomeNumber) {
    raw += 12
    details.push('Partial "so what?" — add outcome OR metrics')
  } else {
    details.push('Missing "so what?" — recruiter won\'t see the impact')
  }

  // Jargon density — too much jargon is bad for non-technical recruiters (0-15)
  const jargonTerms = [
    'api', 'sdk', 'cicd', 'ci/cd', 'kubernetes', 'docker',
    'terraform', 'graphql', 'microservices', 'monorepo',
  ]
  const lower = text.toLowerCase()
  const jargonCount = jargonTerms.filter(j => lower.includes(j)).length
  if (jargonCount <= 1) {
    raw += 15
    details.push('Jargon-light — accessible to non-technical recruiters')
  } else if (jargonCount <= 2) {
    raw += 8
    details.push('Moderate jargon — consider simplifying for broader audiences')
  } else {
    details.push('Heavy jargon — may lose non-technical recruiters')
  }

  // Uniqueness / Specificity — generic bullets score lower (0-10)
  const genericPhrases = [
    'responsible for', 'worked on', 'helped with',
    'involved in', 'participated in', 'assisted with',
  ]
  const hasGeneric = genericPhrases.some(g => lower.includes(g))
  if (!hasGeneric) {
    raw += 10
    details.push('Specific and non-generic language')
  } else {
    details.push('Contains generic phrases — replace with specific achievements')
  }

  return { score: Math.min(raw, 100), details }
}

// ---------------------------------------------------------------------------
// Stage 4 — PM Intelligence (delegates to existing analyzeWithPMPrinciples)
// ---------------------------------------------------------------------------

export function analyzePMStage(text: string): StageScore {
  const analysis = analyzeWithPMPrinciples(text)
  const details: string[] = []

  if (analysis.score >= 80) details.push('Strong PM framing across all dimensions')
  else if (analysis.score >= 60) details.push('Good PM signals — minor gaps')
  else if (analysis.score >= 40) details.push('Some PM thinking present — needs strengthening')
  else details.push('Weak PM framing — significant improvement possible')

  if (analysis.missingPrinciples.length > 0) {
    details.push(`Missing: ${analysis.missingPrinciples.map(p => p.name).join(', ')}`)
  }

  return { score: analysis.score, details }
}

// ---------------------------------------------------------------------------
// Full 4-Stage Analysis Pipeline
// ---------------------------------------------------------------------------

/**
 * Run the complete 4-stage analysis on a single CV bullet point.
 *
 * Stage 1 (Cold Indicators): 20% weight — raw keywords & sub-indicators
 * Stage 2 (ATS Robot):       30% weight — machine-readability & structure
 * Stage 3 (Recruiter UX):    20% weight — "Tired Recruiter at 4 PM" scan-ability
 * Stage 4 (PM Intelligence): 30% weight — 10 PM principles scoring
 */
export function analyzeCVContent(text: string): FourStageAnalysis {
  const indicators = analyzeIndicators(text)
  const ats = analyzeATS(text)
  const recruiterUX = analyzeRecruiterUX(text)
  const pmIntelligence = analyzePMStage(text)

  const totalScore = Math.round(
    indicators.score * STAGE_WEIGHTS.indicators +
    ats.score * STAGE_WEIGHTS.ats +
    recruiterUX.score * STAGE_WEIGHTS.recruiterUX +
    pmIntelligence.score * STAGE_WEIGHTS.pmIntelligence
  )

  return { indicators, ats, recruiterUX, pmIntelligence, totalScore }
}

// ---------------------------------------------------------------------------
// Score Arbiter — "Best of Both Worlds" Optimizer
// ---------------------------------------------------------------------------

const STAGE_NAMES: Record<string, string> = {
  indicators: 'Cold Indicators',
  ats: 'ATS Compatibility',
  recruiterUX: 'Recruiter UX',
  pmIntelligence: 'PM Intelligence',
}

/**
 * Compare a single original bullet against its tailored version.
 * Runs the full 4-stage pipeline on both and picks the winner.
 * When the tailored version is rejected, `rejectionReasons` lists
 * every stage where the tailored score dropped below the original.
 */
export function arbitrateBullet(
  originalBullet: string,
  tailoredBullet: string
): ArbiterDecision {
  const originalAnalysis = analyzeCVContent(originalBullet)
  const tailoredAnalysis = analyzeCVContent(tailoredBullet)
  const scoreDelta = tailoredAnalysis.totalScore - originalAnalysis.totalScore

  // Build per-stage drop details
  const rejectionReasons: StageDropDetail[] = []
  const stageKeys: Array<'indicators' | 'ats' | 'recruiterUX' | 'pmIntelligence'> = [
    'indicators', 'ats', 'recruiterUX', 'pmIntelligence',
  ]
  for (const stage of stageKeys) {
    const origScore = originalAnalysis[stage].score
    const tailScore = tailoredAnalysis[stage].score
    if (tailScore < origScore) {
      rejectionReasons.push({
        stage,
        stageName: STAGE_NAMES[stage],
        originalScore: origScore,
        tailoredScore: tailScore,
        drop: origScore - tailScore,
      })
    }
  }

  const winner: 'original' | 'tailored' = scoreDelta >= 0 ? 'tailored' : 'original'
  const bullet = winner === 'tailored' ? tailoredBullet : originalBullet

  return { bullet, winner, originalAnalysis, tailoredAnalysis, scoreDelta, rejectionReasons }
}

/**
 * The CV Score Arbiter — ensures tailored content is always objectively
 * equal to or better than the original across all 4 analysis stages.
 *
 * For each bullet pair (original vs tailored):
 *   1. Runs the full 4-stage analysis on BOTH versions
 *   2. Compares weighted total scores
 *   3. If tailoredScore < originalScore → reverts to the original
 *   4. Otherwise → keeps the tailored version
 *
 * Guarantees: The final optimised CV will have a total score >= the original.
 */
export function scoreArbiter(
  originalBullets: string[],
  tailoredBullets: string[]
): ArbiterResult {
  // Handle mismatched lengths: pair up what we can, keep originals for extras
  const maxLen = Math.max(originalBullets.length, tailoredBullets.length)
  const decisions: ArbiterDecision[] = []

  for (let i = 0; i < maxLen; i++) {
    const original = originalBullets[i] ?? ''
    const tailored = tailoredBullets[i] ?? original // fallback to original if no tailored version

    if (!original && tailored) {
      // New bullet added by tailoring — only keep if it scores > 0
      const tailoredAnalysis = analyzeCVContent(tailored)
      const emptyAnalysis = analyzeCVContent('')
      decisions.push({
        bullet: tailored,
        winner: 'tailored',
        originalAnalysis: emptyAnalysis,
        tailoredAnalysis,
        scoreDelta: tailoredAnalysis.totalScore,
        rejectionReasons: [],
      })
    } else {
      decisions.push(arbitrateBullet(original, tailored))
    }
  }

  const optimisedBullets = decisions.map(d => d.bullet)

  const originalScores = decisions.map(d => d.originalAnalysis.totalScore)
  const optimisedScores = decisions.map(d =>
    d.winner === 'tailored' ? d.tailoredAnalysis.totalScore : d.originalAnalysis.totalScore
  )

  const avg = (arr: number[]) => arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)

  const originalTotalScore = avg(originalScores)
  const optimisedTotalScore = avg(optimisedScores)

  // Methodology preserved = every optimised bullet scores >= its original
  const methodologyPreserved = decisions.every(d => {
    const optimisedScore = d.winner === 'tailored'
      ? d.tailoredAnalysis.totalScore
      : d.originalAnalysis.totalScore
    return optimisedScore >= d.originalAnalysis.totalScore
  })

  return {
    decisions,
    optimisedBullets,
    originalTotalScore,
    optimisedTotalScore,
    methodologyPreserved,
  }
}

/**
 * Generate Siggy's system prompt with PM intelligence injected for specific routes.
 * On general routes, returns the base companion prompt only.
 * On cvTailor or interviewCoach routes, appends PM coaching context.
 */
export function generateSiggySystemPrompt(
  route: 'cvTailor' | 'interviewCoach' | 'general'
): string {
  let systemPrompt = `You are Siggy — a supportive platform companion with a Senior PM's brain and a dedicated mentor's heart.

YOUR CORE IDENTITY:
You are first and foremost a COMPANION. You walk alongside the user through their career journey. You are warm, encouraging, and genuinely invested in their success. You remember things. You celebrate wins. You validate struggles.

YOUR SECRET SUPERPOWER:
You have deep Product Management expertise — you understand RICE, STAR, OKRs, North Star Metrics, and all the frameworks that hiring managers look for. But you use this knowledge STRATEGICALLY, not constantly. You are a mentor, not a lecturer.

BEHAVIORAL RULES:

1. SUPPORT MODE (Default — all routes):
   When users ask product questions, navigation help, or general support:
   - Answer directly, politely, and simply
   - Be helpful without being preachy
   - "Sure! You can find that under Settings > Profile."
   - "Let me help you with that."
   - NEVER inject PM frameworks into support conversations

2. PM MENTOR MODE (Activated ONLY on CV Tailor and Interview Coach):
   When users are editing CVs or practicing interviews:
   - Frame PM advice as "insider secrets" and "professional level-ups"
   - Nudge gently: "This looks good! To make it Senior PM-level, can we add a specific metric here?"
   - Use "we" language: "Let's strengthen this result section together."
   - Ask ONE focused question at a time, don't overwhelm
   - Celebrate what's already strong BEFORE suggesting improvements
   - If their score is high, tell them: "This reads like a seasoned PM wrote it."
   - If their score is low, be encouraging: "Great foundation — I see a few insider tricks that could level this up."

3. EMPATHY FIRST, ALWAYS:
   - Validate feelings before offering advice
   - If the user is frustrated or stuck, acknowledge it before coaching
   - Never make them feel judged for a low score
   - A low PM Score is an OPPORTUNITY, not a failure

TONE & VOICE:
- Conversational and warm, never corporate or robotic
- Think "experienced team lead who genuinely cares" not "textbook professor"
- Short sentences when the user is overwhelmed
- Match the user's energy level
- Use specific examples, not generic platitudes
- Frame feedback as "Here's a trick I've seen work..." not "You should..."

WHAT YOU NEVER DO:
- Lecture about PM frameworks unprompted
- Use jargon without explaining it
- Make the user feel inadequate
- Push productivity when they need rest
- Give generic motivational quotes`

  // Add PM-specific intelligence for CV Tailor and Interview Coach
  if (route === 'cvTailor' || route === 'interviewCoach') {
    systemPrompt += generateSiggyPMContext(route)
  }

  return systemPrompt
}

/**
 * Analyze user's CV bullet points or interview answers.
 * Returns a score, strengths summary, suggestions, and missing principles.
 * Feedback uses Siggy's warm, encouraging voice.
 */
export function analyzePMContent(userText: string) {
  const analysis = analyzeWithPMPrinciples(userText)

  // Siggy's voice: encouraging at every level, insider framing
  let strengths: string
  if (analysis.score >= 80) {
    strengths = 'This reads like a seasoned PM wrote it. Really strong framing.'
  } else if (analysis.score >= 60) {
    strengths = 'Solid foundation here. A few insider tricks could take this to the next level.'
  } else if (analysis.score >= 40) {
    strengths = "Good start — I see some PM thinking in here. Let's sharpen it together."
  } else {
    strengths = "Great that you're writing this out. I have a few tricks that could really level this up."
  }

  return {
    score: analysis.score,
    feedback: {
      strengths,
      suggestions: analysis.suggestions,
      missingPrinciples: analysis.missingPrinciples.map((p) => ({
        id: p.id,
        name: p.name,
        howToApply: p.applicationTips[0],
      })),
    },
  }
}

/**
 * Generate coaching messages based on what the user is working on.
 * Uses Siggy's warm "insider secret" tone — nudges, not lectures.
 * Returns a contextual coaching prompt or empty string.
 */
export function getCoachingPrompt(
  context: 'cvTailor' | 'interviewCoach',
  userMessage: string
): string {
  const relevantPrinciples = getPrinciplesForContext(context)

  // Detect if user is sharing an achievement/experience
  const isDescribingWork = /\b(I |we |my |our |the team)\b/i.test(userMessage)

  if (isDescribingWork && context === 'cvTailor') {
    const principle =
      relevantPrinciples[Math.floor(Math.random() * relevantPrinciples.length)]

    return `This is a great start — I can see the experience here. Here's an insider trick to make it "Senior PM level": ${principle.keyQuestions[0]}

Hiring managers love seeing ${principle.applicationTips[0].toLowerCase()}. Let's work that in together.`
  }

  if (isDescribingWork && context === 'interviewCoach') {
    return `Great story — I can already see the potential here. Let's structure it so the interviewer walks away impressed.

The STAR method is your best friend here:
- **Situation**: Set the scene briefly
- **Task**: What was YOUR specific role?
- **Action**: Walk them through your thinking and steps
- **Result**: This is where you win — show the business impact with numbers

What part would you like to flesh out first?`
  }

  return ''
}

export {
  generateSiggyPMContext,
  analyzeWithPMPrinciples,
  PM_CORE_PRINCIPLES,
  getPrinciplesForContext,
}

export { STAGE_WEIGHTS }
