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
// Role Detection — determines whether to use PM Specialist or General weights
// ---------------------------------------------------------------------------

const PRODUCT_ROLE_KEYWORDS = [
  'product manager', 'product owner', 'pm', 'cpo', 'chief product',
  'product lead', 'product director', 'product analyst', 'product strategist',
  'product marketing', 'head of product', 'vp of product', 'vp product',
  'group product manager', 'senior product manager', 'associate product manager',
  'technical product manager', 'principal product manager',
]

/**
 * Detect whether a job title refers to a product-related role.
 * Used to dynamically switch between PM Specialist and General Professional
 * weight profiles in the scoring pipeline.
 */
export function isProductRole(jobTitle: string): boolean {
  if (!jobTitle || jobTitle.trim().length === 0) return false
  const lower = jobTitle.toLowerCase().trim()
  return PRODUCT_ROLE_KEYWORDS.some(keyword => lower.includes(keyword))
}

// ---------------------------------------------------------------------------
// Stage Weights — dynamic profiles based on role detection
// ---------------------------------------------------------------------------

export interface WeightProfile {
  indicators: number
  ats: number
  recruiterUX: number
  pmIntelligence: number
}

/**
 * Default weights (used when no jobTitle is provided).
 * ATS Compatibility: 30%  |  Cold Indicators: 20%  |  Recruiter UX: 20%  |  PM Intelligence: 30%
 */
const STAGE_WEIGHTS: WeightProfile = {
  indicators: 0.20,
  ats: 0.30,
  recruiterUX: 0.20,
  pmIntelligence: 0.30,
}

/**
 * Scenario A — Product-Related Roles (The Specialist)
 * Heavy PM Intelligence emphasis to leverage frameworks.
 */
const PM_SPECIALIST_WEIGHTS: WeightProfile = {
  indicators: 0.20,
  ats: 0.25,
  recruiterUX: 0.20,
  pmIntelligence: 0.35,
}

/**
 * Scenario B — General / Non-Product Roles (The Professional)
 * PM Intelligence drops to 5% — focus on ATS readability, recruiter clarity,
 * and standard industry keywords. PM jargon should NOT dominate.
 */
const GENERAL_PROFESSIONAL_WEIGHTS: WeightProfile = {
  indicators: 0.30,
  ats: 0.35,
  recruiterUX: 0.30,
  pmIntelligence: 0.05,
}

/**
 * Get the appropriate weight profile for a given job title.
 * - Product roles → PM Specialist weights (PM Intelligence at 35%)
 * - Non-product roles → General Professional weights (PM Intelligence at 5%)
 * - No job title → Default balanced weights
 */
export function getWeightsForRole(jobTitle?: string): WeightProfile {
  if (!jobTitle || jobTitle.trim().length === 0) return STAGE_WEIGHTS
  return isProductRole(jobTitle) ? PM_SPECIALIST_WEIGHTS : GENERAL_PROFESSIONAL_WEIGHTS
}

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

export function analyzeRecruiterUX(text: string, jobTitle?: string): StageScore {
  const details: string[] = []
  let raw = 0
  const isNonPM = jobTitle ? !isProductRole(jobTitle) : false

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
  const techJargonTerms = [
    'api', 'sdk', 'cicd', 'ci/cd', 'kubernetes', 'docker',
    'terraform', 'graphql', 'microservices', 'monorepo',
  ]
  const pmJargonTerms = [
    'rice', 'okr', 'aarrr', 'north star', 'kano',
    'roadmap', 'backlog', 'sprint', 'stakeholder',
    'cross-functional', 'prioritization framework',
  ]
  const lower = text.toLowerCase()
  const techJargonCount = techJargonTerms.filter(j => lower.includes(j)).length
  // For non-PM roles, PM jargon is also confusing to industry-specific recruiters
  const pmJargonCount = isNonPM ? pmJargonTerms.filter(j => lower.includes(j)).length : 0
  const totalJargonCount = techJargonCount + pmJargonCount

  if (totalJargonCount === 0) {
    raw += 15
    details.push('Jargon-light — accessible to non-technical recruiters')
  } else if (totalJargonCount <= 1) {
    raw += 10
    details.push('Minimal jargon — mostly accessible')
  } else if (totalJargonCount <= 2) {
    raw += 5
    details.push('Moderate jargon — consider simplifying for broader audiences')
  } else {
    // Heavy jargon: actively penalise (subtract from raw score)
    raw -= Math.min(totalJargonCount * 5, 15)
    if (pmJargonCount > 0 && isNonPM) {
      details.push(`PM jargon inappropriate for ${jobTitle} role — recruiter will be confused`)
    } else {
      details.push('Heavy jargon — may lose non-technical recruiters')
    }
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
 * When `jobTitle` is provided, weights are dynamically adjusted:
 *   - Product roles → PM Specialist (PM Intelligence 35%)
 *   - Non-product roles → General Professional (PM Intelligence 5%)
 *   - No job title → Default balanced weights
 */
export function analyzeCVContent(text: string, jobTitle?: string): FourStageAnalysis {
  const indicators = analyzeIndicators(text)
  const ats = analyzeATS(text)
  const recruiterUX = analyzeRecruiterUX(text, jobTitle)
  const pmIntelligence = analyzePMStage(text)

  const weights = getWeightsForRole(jobTitle)

  const totalScore = Math.round(
    indicators.score * weights.indicators +
    ats.score * weights.ats +
    recruiterUX.score * weights.recruiterUX +
    pmIntelligence.score * weights.pmIntelligence
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
 *
 * When `jobTitle` is provided, uses context-aware dynamic weighting.
 */
export function arbitrateBullet(
  originalBullet: string,
  tailoredBullet: string,
  jobTitle?: string
): ArbiterDecision {
  const originalAnalysis = analyzeCVContent(originalBullet, jobTitle)
  const tailoredAnalysis = analyzeCVContent(tailoredBullet, jobTitle)
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
 *   2. Compares weighted total scores (context-aware if jobTitle provided)
 *   3. If tailoredScore < originalScore → reverts to the original
 *   4. Otherwise → keeps the tailored version
 *
 * When `jobTitle` is provided, weights adapt dynamically:
 *   - Product roles → PM Specialist profile (PM Intelligence 35%)
 *   - Non-product roles → General Professional profile (PM Intelligence 5%)
 *
 * Guarantees: The final optimised CV will have a total score >= the original.
 */
export function scoreArbiter(
  originalBullets: string[],
  tailoredBullets: string[],
  jobTitle?: string
): ArbiterResult {
  // Handle mismatched lengths: pair up what we can, keep originals for extras
  const maxLen = Math.max(originalBullets.length, tailoredBullets.length)
  const decisions: ArbiterDecision[] = []

  for (let i = 0; i < maxLen; i++) {
    const original = originalBullets[i] ?? ''
    const tailored = tailoredBullets[i] ?? original // fallback to original if no tailored version

    if (!original && tailored) {
      // New bullet added by tailoring — only keep if it scores > 0
      const tailoredAnalysis = analyzeCVContent(tailored, jobTitle)
      const emptyAnalysis = analyzeCVContent('', jobTitle)
      decisions.push({
        bullet: tailored,
        winner: 'tailored',
        originalAnalysis: emptyAnalysis,
        tailoredAnalysis,
        scoreDelta: tailoredAnalysis.totalScore,
        rejectionReasons: [],
      })
    } else {
      decisions.push(arbitrateBullet(original, tailored, jobTitle))
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
 *
 * When `jobTitle` is provided and is NOT a product role, the feedback
 * softens PM jargon and focuses on universal professional advice instead.
 */
export function analyzePMContent(userText: string, jobTitle?: string) {
  const analysis = analyzeWithPMPrinciples(userText)
  const productRole = jobTitle ? isProductRole(jobTitle) : true

  // Siggy's voice adapts: PM insider framing for product roles,
  // professional coaching for everyone else
  let strengths: string
  if (productRole) {
    if (analysis.score >= 80) {
      strengths = 'This reads like a seasoned PM wrote it. Really strong framing.'
    } else if (analysis.score >= 60) {
      strengths = 'Solid foundation here. A few insider tricks could take this to the next level.'
    } else if (analysis.score >= 40) {
      strengths = "Good start — I see some PM thinking in here. Let's sharpen it together."
    } else {
      strengths = "Great that you're writing this out. I have a few tricks that could really level this up."
    }
  } else {
    // Non-PM: universal professional coaching — no PM jargon
    if (analysis.score >= 80) {
      strengths = 'This is really well written. Clear impact and strong professional framing.'
    } else if (analysis.score >= 60) {
      strengths = 'Good foundation here. A few tweaks could make this stand out even more.'
    } else if (analysis.score >= 40) {
      strengths = "Nice start — I can see the experience coming through. Let's make it shine."
    } else {
      strengths = "Great that you're putting this together. I have a few tips to make it really stand out."
    }
  }

  // Filter suggestions: for non-PM roles, translate PM-specific advice to universal language
  const suggestions = productRole
    ? analysis.suggestions
    : analysis.suggestions.map(s =>
        s.replace(/PM principles/gi, 'professional best practices')
         .replace(/cross-functional/gi, 'across teams')
         .replace(/stakeholder/gi, 'key people')
      )

  return {
    score: analysis.score,
    feedback: {
      strengths,
      suggestions,
      missingPrinciples: analysis.missingPrinciples.map((p) => ({
        id: p.id,
        name: p.name,
        howToApply: productRole
          ? p.applicationTips[0]
          : p.applicationTips[0]
              .replace(/PM/g, 'professional')
              .replace(/product/gi, 'work'),
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

// ---------------------------------------------------------------------------
// Tailoring Editor — keyword extraction, gap detection for bullet cards
// ---------------------------------------------------------------------------

export interface KeywordMatch {
  /** The keyword text */
  keyword: string
  /** Start index in the bullet text */
  startIndex: number
  /** End index in the bullet text */
  endIndex: number
}

export interface GapClosure {
  /** Gap principle name that this bullet closes */
  gapName: string
  /** Principle ID */
  principleId: string
}

export interface TailoringAnalysis {
  /** Keywords from the job description found in the suggested bullet */
  matchedKeywords: KeywordMatch[]
  /** Gaps that this suggested bullet helps close */
  gapsClosing: GapClosure[]
  /** Score delta between original and suggested */
  scoreDelta: number
  /** Original bullet score (0-100) */
  originalScore: number
  /** Suggested bullet score (0-100) */
  suggestedScore: number
  /** Narrative alignment boost (0-100 delta), present when narrative profile provided */
  narrativeBoost?: number
  /** Narrative match % of the suggested bullet against target archetype */
  narrativeMatchPercent?: number
  /** Original bullet's narrative match % */
  originalNarrativePercent?: number
  /** Whether this bullet is a "Top Pick" for narrative alignment */
  isNarrativeTopPick?: boolean
  /** Human-readable narrative boost label (e.g., "Boosts Strategic Signal") */
  narrativeBoostLabel?: string
}

/**
 * Extract meaningful keywords from a job description.
 * Returns unique multi-word and single-word phrases that are
 * likely to be ATS-relevant.
 */
export function extractJobKeywords(jobDescription: string): string[] {
  if (!jobDescription || jobDescription.trim().length === 0) return []

  const lower = jobDescription.toLowerCase()
  const keywords: Set<string> = new Set()

  // Multi-word phrases (2-3 words that appear meaningful)
  const multiWordPatterns = [
    /\b(computer vision|machine learning|deep learning|natural language|data science)\b/gi,
    /\b(project management|product management|business intelligence|user experience)\b/gi,
    /\b(a\/b testing|root cause|cross.functional|full.stack|end.to.end)\b/gi,
    /\b(kpi tracking|data.driven|customer.facing|revenue growth|cost reduction)\b/gi,
    /\b(agile methodology|scrum master|design thinking|lean startup)\b/gi,
    /\b(stakeholder management|budget management|team leadership|strategic planning)\b/gi,
  ]

  for (const pattern of multiWordPatterns) {
    const matches = jobDescription.match(pattern) || []
    matches.forEach(m => keywords.add(m.toLowerCase().trim()))
  }

  // Single-word technical and business keywords
  const singleKeywordList = [
    'python', 'javascript', 'typescript', 'react', 'node', 'sql', 'aws', 'gcp',
    'azure', 'docker', 'kubernetes', 'api', 'rest', 'graphql', 'saas', 'b2b', 'b2c',
    'analytics', 'metrics', 'roadmap', 'strategy', 'prioritization', 'okr', 'kpi',
    'revenue', 'growth', 'retention', 'conversion', 'engagement', 'acquisition',
    'scrum', 'agile', 'sprint', 'backlog', 'jira', 'confluence', 'figma',
    'tableau', 'looker', 'amplitude', 'mixpanel', 'segment',
    'leadership', 'collaboration', 'innovation', 'optimization', 'scalability',
    'compliance', 'governance', 'automation', 'integration', 'pipeline',
    'budget', 'forecast', 'audit', 'regulatory', 'certification',
  ]

  for (const kw of singleKeywordList) {
    if (lower.includes(kw)) keywords.add(kw)
  }

  // Extract capitalized terms from the JD that look like proper nouns / tools
  const capitalizedTerms = jobDescription.match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)?\b/g) || []
  for (const term of capitalizedTerms) {
    const tl = term.toLowerCase()
    // Skip common words
    if (['the', 'and', 'for', 'with', 'our', 'you', 'will', 'are', 'this', 'that', 'from', 'have', 'been'].includes(tl)) continue
    if (term.length >= 3) keywords.add(tl)
  }

  return Array.from(keywords).sort((a, b) => b.length - a.length) // longest first for matching
}

/**
 * Find keyword matches in a bullet text.
 * Returns matches with their positions for highlighting.
 */
export function findKeywordMatches(text: string, keywords: string[]): KeywordMatch[] {
  const matches: KeywordMatch[] = []
  const lower = text.toLowerCase()

  for (const keyword of keywords) {
    let searchFrom = 0
    const kl = keyword.toLowerCase()
    while (searchFrom < lower.length) {
      const idx = lower.indexOf(kl, searchFrom)
      if (idx === -1) break

      // Check word boundary (avoid matching inside words)
      const charBefore = idx > 0 ? lower[idx - 1] : ' '
      const charAfter = idx + kl.length < lower.length ? lower[idx + kl.length] : ' '
      const isWordBoundary = /[\s,.;:!?()[\]{}\/\-]/.test(charBefore) || idx === 0
      const isEndBoundary = /[\s,.;:!?()[\]{}\/\-]/.test(charAfter) || idx + kl.length === lower.length

      if (isWordBoundary && isEndBoundary) {
        // Check no overlap with existing matches
        const overlaps = matches.some(
          m => (idx >= m.startIndex && idx < m.endIndex) || (idx + kl.length > m.startIndex && idx + kl.length <= m.endIndex)
        )
        if (!overlaps) {
          matches.push({
            keyword: text.substring(idx, idx + kl.length), // preserve original casing
            startIndex: idx,
            endIndex: idx + kl.length,
          })
        }
      }
      searchFrom = idx + 1
    }
  }

  return matches.sort((a, b) => a.startIndex - b.startIndex)
}

/**
 * Detect which competency gaps a suggested bullet helps close.
 * Compares the suggested bullet's principle coverage against the original.
 */
export function detectGapClosures(
  originalBullet: string,
  suggestedBullet: string
): GapClosure[] {
  const closures: GapClosure[] = []

  const gapPrincipleKeywords: Record<string, { name: string; keywords: string[] }> = {
    'outcome-over-output': { name: 'Outcomes', keywords: ['increased', 'improved', 'reduced', 'resulted', 'achieved', 'generated'] },
    'data-driven-decisions': { name: 'Data-Driven', keywords: ['%', '$', 'data', 'metrics', 'analytics', 'measured'] },
    'user-centricity': { name: 'User Focus', keywords: ['user', 'customer', 'client', 'people', 'experience'] },
    'strategic-thinking': { name: 'Strategy', keywords: ['strategy', 'roadmap', 'prioriti', 'initiative'] },
    'cross-functional-leadership': { name: 'Leadership', keywords: ['cross-functional', 'led', 'team', 'stakeholder', 'aligned'] },
  }

  const origLower = originalBullet.toLowerCase()
  const sugLower = suggestedBullet.toLowerCase()

  for (const [principleId, config] of Object.entries(gapPrincipleKeywords)) {
    const origHits = config.keywords.filter(kw => origLower.includes(kw)).length
    const sugHits = config.keywords.filter(kw => sugLower.includes(kw)).length

    // Gap is "closed" if original had 0 hits and suggested has 2+
    if (origHits === 0 && sugHits >= 2) {
      closures.push({ gapName: config.name, principleId })
    }
  }

  return closures
}

/**
 * Analyze a single bullet pair for the tailoring editor.
 * Returns keyword matches, gap closures, and score comparison.
 */
export function analyzeTailoringPair(
  originalBullet: string,
  suggestedBullet: string,
  jobKeywords: string[],
  jobTitle?: string
): TailoringAnalysis {
  const originalAnalysis = analyzeCVContent(originalBullet, jobTitle)
  const suggestedAnalysis = analyzeCVContent(suggestedBullet, jobTitle)

  return {
    matchedKeywords: findKeywordMatches(suggestedBullet, jobKeywords),
    gapsClosing: detectGapClosures(originalBullet, suggestedBullet),
    scoreDelta: suggestedAnalysis.totalScore - originalAnalysis.totalScore,
    originalScore: originalAnalysis.totalScore,
    suggestedScore: suggestedAnalysis.totalScore,
  }
}

// ---------------------------------------------------------------------------
// Indicator Detail Analysis — sub-indicators, evidence, and action items
// ---------------------------------------------------------------------------

export interface SubIndicator {
  /** Sub-criterion name (e.g., "Metric Usage") */
  name: string
  /** Score 0-10 for this sub-criterion */
  score: number
  /** Max possible score */
  maxScore: number
}

export interface EvidenceHighlight {
  /** The bullet text excerpt that contributed to this score */
  text: string
  /** Whether this is positive evidence or needs improvement */
  sentiment: 'positive' | 'needs-work'
}

export interface IndicatorDetail {
  /** Principle ID this detail belongs to */
  principleId: string
  /** 3-5 sub-indicators with individual scores */
  subIndicators: SubIndicator[]
  /** 2-3 evidence highlights from the user's CV */
  evidence: EvidenceHighlight[]
  /** Siggy's specific one-sentence action item to reach 10/10 */
  actionItem: string
}

// Sub-indicator definitions per principle
const PRINCIPLE_SUB_INDICATORS: Record<string, { name: string; keywords: string[]; weight: number }[]> = {
  'outcome-over-output': [
    { name: 'Result Language', keywords: ['increased', 'improved', 'reduced', 'achieved', 'resulted', 'enabled', 'generated'], weight: 3 },
    { name: 'Before/After Contrast', keywords: ['from', 'to', 'before', 'after', 'previously', 'now'], weight: 2 },
    { name: 'Business Connection', keywords: ['revenue', 'growth', 'retention', 'efficiency', 'adoption', 'engagement'], weight: 3 },
    { name: '"So What?" Closure', keywords: ['resulting in', 'leading to', 'which led', 'thereby', 'enabling'], weight: 2 },
  ],
  'data-driven-decisions': [
    { name: 'Metric Usage', keywords: ['%', '$', 'kpi', 'metric', 'nps', 'csat', 'arr', 'mrr'], weight: 3 },
    { name: 'Outcome Alignment', keywords: ['improved', 'increased', 'reduced', 'optimized', 'achieved'], weight: 2 },
    { name: 'Methodology', keywords: ['a/b', 'test', 'experiment', 'analysis', 'analytics', 'measured', 'tracked'], weight: 3 },
    { name: 'Scale Accuracy', keywords: ['users', 'customers', 'transactions', 'sessions', 'people', 'teams'], weight: 2 },
  ],
  'user-centricity': [
    { name: 'User Mention', keywords: ['user', 'customer', 'client', 'patient', 'people', 'persona'], weight: 3 },
    { name: 'Pain Point Framing', keywords: ['pain point', 'struggle', 'challenge', 'need', 'frustration', 'problem'], weight: 2 },
    { name: 'Research Methods', keywords: ['interview', 'survey', 'usability', 'feedback', 'research', 'insights'], weight: 3 },
    { name: 'User Impact Metric', keywords: ['satisfaction', 'nps', 'adoption', 'engagement', 'retention', 'experience'], weight: 2 },
  ],
  'strategic-thinking': [
    { name: 'Vision & Direction', keywords: ['strategy', 'strategic', 'vision', 'long-term', 'mission'], weight: 3 },
    { name: 'Prioritization', keywords: ['prioriti', 'roadmap', 'trade-off', 'decision', 'framework', 'rice'], weight: 3 },
    { name: 'Market Awareness', keywords: ['market', 'competitive', 'competitor', 'industry', 'trend', 'opportunity'], weight: 2 },
    { name: 'Business Alignment', keywords: ['alignment', 'aligned', 'initiative', 'objective', 'goal', 'okr'], weight: 2 },
  ],
  'cross-functional-leadership': [
    { name: 'Team Breadth', keywords: ['cross-functional', 'engineering', 'design', 'marketing', 'sales', 'operations'], weight: 3 },
    { name: 'Leadership Signal', keywords: ['led', 'drove', 'spearheaded', 'orchestrated', 'managed', 'directed'], weight: 3 },
    { name: 'Stakeholder Alignment', keywords: ['stakeholder', 'aligned', 'consensus', 'buy-in', 'c-suite', 'executive'], weight: 2 },
    { name: 'Team Scale', keywords: ['team of', 'engineers', 'members', 'people', 'direct reports'], weight: 2 },
  ],
  'problem-solving': [
    { name: 'Problem Framing', keywords: ['problem', 'challenge', 'issue', 'bottleneck', 'gap', 'blocker'], weight: 3 },
    { name: 'Diagnosis Method', keywords: ['root cause', 'diagnosed', 'identified', 'analyzed', '5 whys', 'investigation'], weight: 3 },
    { name: 'Solution Evaluation', keywords: ['evaluated', 'alternative', 'option', 'approach', 'solution', 'resolved'], weight: 2 },
    { name: 'Outcome Proof', keywords: ['resolved', 'fixed', 'eliminated', 'reduced', 'solved', 'improved'], weight: 2 },
  ],
  'iterative-development': [
    { name: 'MVP / Scoping', keywords: ['mvp', 'prototype', 'pilot', 'beta', 'scope', 'minimal'], weight: 3 },
    { name: 'Iteration Cycles', keywords: ['iterated', 'iteration', 'version', 'v2', 'refined', 'improved'], weight: 2 },
    { name: 'Speed Signal', keywords: ['sprint', 'agile', 'shipped', 'launched', 'week', 'rapid'], weight: 3 },
    { name: 'Learning Loop', keywords: ['learned', 'feedback', 'tested', 'experiment', 'validated', 'adapted'], weight: 2 },
  ],
  'communication-storytelling': [
    { name: 'Presentation Skill', keywords: ['presented', 'communicated', 'pitch', 'demo', 'all-hands', 'board'], weight: 3 },
    { name: 'Audience Tailoring', keywords: ['executive', 'stakeholder', 'team', 'engineering', 'non-technical', 'customer'], weight: 2 },
    { name: 'Narrative Structure', keywords: ['narrative', 'story', 'vision', 'case study', 'report', 'prd'], weight: 3 },
    { name: 'Action Driven', keywords: ['buy-in', 'approved', 'secured', 'convinced', 'influenced', 'aligned'], weight: 2 },
  ],
  'technical-aptitude': [
    { name: 'System Knowledge', keywords: ['platform', 'api', 'infrastructure', 'system', 'architecture', 'database'], weight: 3 },
    { name: 'Technical Decisions', keywords: ['technical', 'trade-off', 'scalab', 'performance', 'reliability', 'latency'], weight: 3 },
    { name: 'Tooling Reference', keywords: ['integration', 'pipeline', 'deployment', 'automation', 'monitoring', 'ci/cd'], weight: 2 },
    { name: 'Eng Collaboration', keywords: ['engineering', 'engineer', 'developer', 'architect', 'feasibility'], weight: 2 },
  ],
  'business-acumen': [
    { name: 'Revenue Impact', keywords: ['revenue', 'profit', 'arr', 'mrr', '$', 'monetization', 'pricing'], weight: 3 },
    { name: 'Growth Metrics', keywords: ['growth', 'acquisition', 'conversion', 'churn', 'ltv', 'retention'], weight: 3 },
    { name: 'ROI / Efficiency', keywords: ['roi', 'cost', 'savings', 'efficiency', 'budget', 'margin'], weight: 2 },
    { name: 'Market Dynamics', keywords: ['market', 'competitive', 'positioning', 'segment', 'opportunity'], weight: 2 },
  ],
}

// Action items per principle per score range
const PRINCIPLE_ACTION_ITEMS: Record<string, { high: string; mid: string; low: string }> = {
  'outcome-over-output': {
    high: 'Add a "before vs after" contrast to your strongest bullet to make the transformation even more vivid.',
    mid: 'Rewrite your top bullet using the formula: "[Action verb] [what you did], resulting in [specific metric]."',
    low: 'Pick your biggest achievement and answer: "What changed because of my work?" — that answer IS your bullet.',
  },
  'data-driven-decisions': {
    high: 'Mention the specific tool or method you used to gather data (e.g., "using Mixpanel analytics" or "through A/B testing").',
    mid: 'Add at least one concrete number to each bullet — even "5 stakeholders" or "3 iterations" counts.',
    low: 'Start one bullet with: "Analyzed [data source] to discover [insight], leading to [action] that improved [metric] by [X%]."',
  },
  'user-centricity': {
    high: 'Name the specific user segment (e.g., "enterprise customers" or "first-time mobile users") instead of generic "users".',
    mid: 'Add how you gathered user insights — even "based on 50+ customer support tickets" shows user awareness.',
    low: 'Answer this in your strongest bullet: "Who specifically benefited from my work, and what was their pain point?"',
  },
  'strategic-thinking': {
    high: 'Reference a specific framework or trade-off decision to show your strategic process, not just the outcome.',
    mid: 'Connect one bullet to a larger business objective: "...aligned with the company\'s goal to expand into [market]."',
    low: 'Add "prioritized X over Y because [strategic reason]" to show you think beyond the immediate task.',
  },
  'cross-functional-leadership': {
    high: 'Add the team scale (e.g., "team of 12 across 4 departments") to quantify the collaboration scope.',
    mid: 'Replace "worked with" with "led" or "aligned" to signal leadership, even if your title wasn\'t "lead".',
    low: 'Add one bullet that mentions at least two different teams you worked with and the outcome you achieved together.',
  },
  'problem-solving': {
    high: 'Mention one alternative you considered and why you chose your approach — this shows analytical depth.',
    mid: 'Frame one bullet as "Identified [problem] through [method], then [solution] resulting in [outcome]."',
    low: 'Start a bullet with the challenge first: "Faced [X problem] and solved it by [approach], reducing [metric] by [Y%]."',
  },
  'iterative-development': {
    high: 'Add a "shipped in X weeks" timeline to showcase speed alongside quality.',
    mid: 'Mention a learning you took from v1 to v2: "Based on beta feedback, iterated to improve [metric] by [X%]."',
    low: 'Add one reference to shipping fast: "Launched MVP in [timeframe]" or "Ran [N] iteration cycles."',
  },
  'communication-storytelling': {
    high: 'Mention the audience size or seniority: "Presented to 200+ at all-hands" or "Secured C-suite approval."',
    mid: 'Use the Action → Method → Outcome structure consistently: it makes every bullet tell a complete story.',
    low: 'Add one bullet about presenting, writing, or communicating that led to a concrete decision or approval.',
  },
  'technical-aptitude': {
    high: 'Show a technical trade-off you navigated: "Chose X over Y for [performance/scalability reason]."',
    mid: 'Name the specific platform, tool, or technology you used — even "using our REST API" adds credibility.',
    low: 'Mention one technical context: the system you worked with, the tool you evaluated, or the constraint you managed.',
  },
  'business-acumen': {
    high: 'Add a revenue timeline: "$X ARR generated in first [N] months" makes the business impact concrete.',
    mid: 'Connect one achievement to a business metric: revenue, cost savings, conversion rate, or customer LTV.',
    low: 'End your strongest bullet with a business result: "...saving $X per quarter" or "...growing revenue by Y%."',
  },
}

/**
 * Analyze a principle in detail: produces sub-indicator scores,
 * evidence highlights from specific bullets, and a targeted action item.
 *
 * This powers the accordion detail view in the CV Analysis Dashboard.
 */
export function analyzeIndicatorDetail(
  principleId: string,
  bullets: string[],
  overallScore: number
): IndicatorDetail {
  const subDefs = PRINCIPLE_SUB_INDICATORS[principleId] || []
  const lower = bullets.map(b => b.toLowerCase())
  const combined = lower.join(' ')

  // Score each sub-indicator
  const subIndicators: SubIndicator[] = subDefs.map(sub => {
    const hits = sub.keywords.filter(kw => combined.includes(kw)).length
    const maxHits = Math.max(sub.keywords.length * 0.4, 1)
    const raw = Math.min(Math.round((hits / maxHits) * 10), 10)
    return { name: sub.name, score: raw, maxScore: 10 }
  })

  // Extract evidence highlights — find bullets that match this principle's keywords
  const allKeywords = subDefs.flatMap(s => s.keywords)
  const evidence: EvidenceHighlight[] = []

  for (const bullet of bullets) {
    if (evidence.length >= 3) break
    if (bullet.trim().length < 10) continue

    const bl = bullet.toLowerCase()
    const matchCount = allKeywords.filter(kw => bl.includes(kw)).length

    if (matchCount >= 2) {
      evidence.push({ text: bullet.trim(), sentiment: 'positive' })
    } else if (matchCount === 0 && evidence.length < 2) {
      // This bullet has no signal for this principle — it needs work
      evidence.push({ text: bullet.trim(), sentiment: 'needs-work' })
    }
  }

  // If we found no positive evidence, grab the best available bullet as needs-work
  if (evidence.length === 0 && bullets.length > 0) {
    const best = bullets.find(b => b.trim().length >= 10) || bullets[0]
    if (best) evidence.push({ text: best.trim(), sentiment: 'needs-work' })
  }

  // Select action item based on score
  const actions = PRINCIPLE_ACTION_ITEMS[principleId] || {
    high: 'Continue refining this area — small details compound.',
    mid: 'Focus on adding one concrete example or metric.',
    low: 'Start by answering "What changed because of my work?" for this dimension.',
  }

  let actionItem: string
  if (overallScore >= 7) actionItem = actions.high
  else if (overallScore >= 4) actionItem = actions.mid
  else actionItem = actions.low

  return { principleId, subIndicators, evidence, actionItem }
}

// ---------------------------------------------------------------------------
// Gap Identification — surfaces competency gaps as mentoring questions
// ---------------------------------------------------------------------------

export interface GapQuestion {
  /** Unique ID for this gap */
  id: string
  /** PM principle or competency this gap relates to */
  principleId: string
  /** Human-readable principle name */
  principleName: string
  /** The question Siggy asks the user */
  question: string
  /** "Why we ask this" explanation */
  whyWeAsk: string
  /** Estimated score boost if answered well (percentage points) */
  potentialBoost: number
  /** AI draft hint — context for generating a suggested answer */
  draftContext: string
}

export interface GapAnalysisResult {
  /** Identified gaps sorted by potential impact (highest first) */
  gaps: GapQuestion[]
  /** Current total score before gap-filling */
  currentScore: number
  /** Projected score if all gaps are filled */
  projectedScore: number
  /** Number of principles that are weak (<40% of max) */
  weakPrincipleCount: number
}

/**
 * Identify competency gaps from CV content analysis.
 * Uses the 4-stage pipeline + PM principle analysis to surface the
 * highest-impact questions that would close score gaps.
 *
 * Returns questions sorted by potential boost (highest first),
 * capped at `maxQuestions` (default 5).
 */
export function identifyGaps(
  bullets: string[],
  jobTitle?: string,
  jobDescription?: string,
  maxQuestions: number = 5
): GapAnalysisResult {
  const combined = bullets.join(' ')
  const analysis = analyzeCVContent(combined, jobTitle)
  const pmAnalysis = analyzeWithPMPrinciples(combined)
  const isProductRoleFlag = jobTitle ? isProductRole(jobTitle) : true

  const gaps: GapQuestion[] = []

  // ---- Stage-level gap detection ----

  // Indicators gap: missing metrics/numbers
  if (analysis.indicators.score < 50) {
    const boost = Math.round((50 - analysis.indicators.score) * 0.20)
    gaps.push({
      id: 'gap-metrics',
      principleId: 'data-driven-decisions',
      principleName: 'Quantified Impact',
      question: 'Can you share specific numbers from your work? For example: team size, users served, percentage improvements, revenue impact, or time saved?',
      whyWeAsk: `This role values measurable impact. Adding concrete metrics could boost your score by ~${boost}%.`,
      potentialBoost: boost,
      draftContext: 'User needs help quantifying their achievements with specific numbers and percentages.',
    })
  }

  // ATS gap: structure or terminology
  if (analysis.ats.score < 50) {
    const boost = Math.round((50 - analysis.ats.score) * 0.30)
    gaps.push({
      id: 'gap-ats-keywords',
      principleId: 'strategic-thinking',
      principleName: 'Industry Keywords',
      question: jobDescription
        ? 'Looking at the job description, are there specific tools, technologies, or methodologies you\'ve used that we should highlight?'
        : 'What tools, technologies, or industry-specific methodologies have you used in your work?',
      whyWeAsk: `ATS systems scan for relevant keywords. Strengthening this area could boost your match by ~${boost}%.`,
      potentialBoost: boost,
      draftContext: `User needs to surface industry keywords and terminology. ${jobDescription ? 'Job description available for keyword matching.' : 'No job description provided.'}`,
    })
  }

  // Recruiter UX gap: "so what?" factor
  if (analysis.recruiterUX.score < 50) {
    const boost = Math.round((50 - analysis.recruiterUX.score) * 0.20)
    gaps.push({
      id: 'gap-so-what',
      principleId: 'outcome-over-output',
      principleName: 'Clear Impact Story',
      question: 'What\'s the single most impressive result from your work that a recruiter should notice in the first 5 seconds of reading your CV?',
      whyWeAsk: `Recruiters spend ~6 seconds per CV. A clear impact story could boost readability by ~${boost}%.`,
      potentialBoost: boost,
      draftContext: 'User needs to articulate their most impressive achievement in a recruiter-scannable way.',
    })
  }

  // ---- PM Principle-level gap detection ----

  const principleGapMap: Record<string, { question: string; whyWeAsk: string; draftContext: string }> = {
    'outcome-over-output': {
      question: 'For your biggest project, what changed because of your work? Think: before vs. after — what metric moved?',
      whyWeAsk: 'Hiring managers want to see outcomes, not just activities. This is often the #1 differentiator.',
      draftContext: 'User needs to reframe work from tasks completed to outcomes achieved.',
    },
    'data-driven-decisions': {
      question: 'Was there a time you used data or research to make a key decision? What data did you look at, and what did you decide?',
      whyWeAsk: isProductRoleFlag
        ? 'Data-driven decision making is a core PM competency that hiring managers specifically look for.'
        : 'Employers value professionals who can back up decisions with evidence.',
      draftContext: 'User needs to describe a data-informed decision with specific metrics.',
    },
    'user-centricity': {
      question: 'Who were the end users or customers of your work? How did you understand their needs?',
      whyWeAsk: 'Showing you understand the people you serve demonstrates empathy and strategic thinking.',
      draftContext: 'User needs to articulate who they served and how they gathered user/customer insights.',
    },
    'cross-functional-leadership': {
      question: 'Tell me about a time you worked across teams or departments. Who was involved and how did you align everyone?',
      whyWeAsk: isProductRoleFlag
        ? 'Cross-functional leadership is essential for PM roles — it shows you can lead without authority.'
        : 'Collaboration across teams shows leadership potential and organizational awareness.',
      draftContext: 'User needs to describe cross-team collaboration and stakeholder alignment.',
    },
    'problem-solving': {
      question: 'What was the trickiest problem you solved at work? Walk me through how you approached it.',
      whyWeAsk: 'Problem-solving ability is one of the top 3 things interviewers assess. This will strengthen both your CV and interview prep.',
      draftContext: 'User needs to describe a structured approach to solving a complex problem.',
    },
  }

  for (const principle of pmAnalysis.missingPrinciples) {
    const gapConfig = principleGapMap[principle.id]
    if (!gapConfig) continue
    // Skip if we already have a stage-level gap covering similar ground
    if (principle.id === 'data-driven-decisions' && gaps.some(g => g.id === 'gap-metrics')) continue
    if (principle.id === 'outcome-over-output' && gaps.some(g => g.id === 'gap-so-what')) continue

    const boost = Math.round(20 * getWeightsForRole(jobTitle).pmIntelligence)
    gaps.push({
      id: `gap-${principle.id}`,
      principleId: principle.id,
      principleName: principle.name,
      question: gapConfig.question,
      whyWeAsk: gapConfig.whyWeAsk,
      potentialBoost: Math.max(boost, 3), // minimum 3% boost
      draftContext: gapConfig.draftContext,
    })
  }

  // Sort by potential boost (highest first) and cap
  gaps.sort((a, b) => b.potentialBoost - a.potentialBoost)
  const capped = gaps.slice(0, maxQuestions)

  const projectedBoost = capped.reduce((sum, g) => sum + g.potentialBoost, 0)

  return {
    gaps: capped,
    currentScore: analysis.totalScore,
    projectedScore: Math.min(analysis.totalScore + projectedBoost, 100),
    weakPrincipleCount: pmAnalysis.missingPrinciples.length,
  }
}

/**
 * Generate an AI-drafted answer suggestion for a gap question.
 * Uses the user's existing CV bullets + job context to produce
 * a professional draft the user can edit for authenticity.
 */
export function draftGapAnswer(
  gap: GapQuestion,
  existingBullets: string[],
  jobTitle?: string,
  jobDescription?: string
): string {
  const isProductRoleFlag = jobTitle ? isProductRole(jobTitle) : true
  const combined = existingBullets.join('. ')

  // Extract context clues from existing bullets
  const hasNumbers = /\d+%|\$\d+|\d+x|\d+ (users|customers|people|patients|deliveries)/.test(combined)
  const hasTeamMention = /\b(team|cross-functional|collaborated|partnered)\b/i.test(combined)
  const hasTools = /\b(api|platform|dashboard|system|tool|software)\b/i.test(combined)

  switch (gap.principleId) {
    case 'data-driven-decisions':
      return hasNumbers
        ? 'Based on my analysis of [specific data source], I identified [key insight] which led to [decision]. This resulted in [X%] improvement in [metric], validated through [method].'
        : 'I regularly tracked [key metrics] to inform my decisions. For example, when I noticed [observation], I [action taken], which led to [measurable result].'

    case 'outcome-over-output':
      return 'Before my involvement, [situation/problem]. I [specific action], which resulted in [measurable outcome — e.g., X% improvement, $Y saved, Z users impacted]. This mattered because [business context].'

    case 'user-centricity':
      return 'I served [specific user group — e.g., 500 enterprise customers, 40 patients daily]. To understand their needs, I [research method — e.g., conducted interviews, analyzed feedback]. This insight led me to [action], improving [user metric] by [amount].'

    case 'cross-functional-leadership':
      return hasTeamMention
        ? 'I led a cross-functional effort with [teams involved — e.g., engineering, design, marketing]. I aligned the group by [method — e.g., weekly syncs, shared dashboards], navigating [challenge] to deliver [outcome] on time.'
        : 'I collaborated with [departments/teams] to [goal]. By [coordination method], we achieved [result] despite [constraint or challenge].'

    case 'problem-solving':
      return 'The challenge was [specific problem]. I diagnosed the root cause by [method — e.g., data analysis, user feedback, 5 Whys]. After evaluating [N alternatives], I chose [solution] because [reasoning]. The result: [measurable improvement].'

    case 'strategic-thinking':
      return isProductRoleFlag
        ? 'I evaluated the opportunity using [framework — e.g., RICE, impact/effort matrix], balancing [trade-off A] against [trade-off B]. This strategic choice aligned with [company goal] and delivered [outcome].'
        : 'I assessed the situation by considering [factors], prioritized [approach] over alternatives because [reasoning], and this decision led to [measurable result].'

    default:
      return hasTools
        ? `In my role, I [relevant action using ${gap.principleName.toLowerCase()} skills], leveraging [tools/methods] to achieve [specific result]. This experience demonstrates [key competency].`
        : `I [relevant action], focusing on [key aspect of ${gap.principleName.toLowerCase()}]. For example, [specific situation] where I [action] resulting in [outcome].`
  }
}

// ---------------------------------------------------------------------------
// Application Strategy — "Your Winning Strategy" card data
// ---------------------------------------------------------------------------

export interface StrategicPillar {
  /** Short title (e.g., "Regulatory Expertise") */
  title: string
  /** One-sentence explanation */
  description: string
  /** Principle ID this pillar derives from */
  principleId: string
}

export interface TalkingPoint {
  /** The hook sentence */
  point: string
  /** Which bullet it was derived from */
  sourceBullet: string
}

export interface ApplicationStrategy {
  /** Core value proposition — 1 sentence (e.g., "The bridge between X and Y") */
  valueProposition: string
  /** Top 3 strategic pillars identified from the CV */
  strategicPillars: StrategicPillar[]
  /** AI-generated 3-4 sentence executive summary for cover letter / LinkedIn */
  executiveSummary: string
  /** 2-3 key talking points for interviews */
  talkingPoints: TalkingPoint[]
  /** Success probability 0-100 based on final tailored score */
  successProbability: number
  /** Human-readable confidence label */
  confidenceLabel: string
  /** Final tailored score used for computation */
  tailoredScore: number
}

// Pillar templates keyed by principle ID
const PILLAR_TEMPLATES: Record<string, { title: string; descriptionTemplate: string }> = {
  'outcome-over-output': {
    title: 'Results-Driven Impact',
    descriptionTemplate: 'Your CV demonstrates a track record of delivering measurable business outcomes, not just shipping features.',
  },
  'data-driven-decisions': {
    title: 'Data-Driven Decision Making',
    descriptionTemplate: 'Strong evidence of using metrics, analytics, and quantified results to inform decisions and validate impact.',
  },
  'user-centricity': {
    title: 'User-First Mindset',
    descriptionTemplate: 'Clear focus on understanding and serving end users, with evidence of research-informed product decisions.',
  },
  'strategic-thinking': {
    title: 'Strategic Vision',
    descriptionTemplate: 'Demonstrated ability to align tactical work with long-term business strategy and prioritize effectively.',
  },
  'cross-functional-leadership': {
    title: 'Cross-Functional Leadership',
    descriptionTemplate: 'Proven ability to lead through influence across engineering, design, and business stakeholders.',
  },
  'problem-solving': {
    title: 'Analytical Problem Solving',
    descriptionTemplate: 'Evidence of structured root-cause analysis and creative solutions to complex challenges.',
  },
  'iterative-development': {
    title: 'Agile Execution',
    descriptionTemplate: 'Track record of shipping fast, iterating on feedback, and building with an MVP mindset.',
  },
  'communication-storytelling': {
    title: 'Executive Communication',
    descriptionTemplate: 'Ability to craft compelling narratives and secure buy-in from senior leadership.',
  },
  'technical-aptitude': {
    title: 'Technical Credibility',
    descriptionTemplate: 'Deep technical understanding that enables productive partnerships with engineering teams.',
  },
  'business-acumen': {
    title: 'Commercial Acumen',
    descriptionTemplate: 'Strong understanding of revenue, growth metrics, and how product decisions drive business results.',
  },
}

/**
 * Generate a comprehensive application strategy from tailored CV bullets.
 *
 * Analyzes the candidate's strongest principles, crafts a value proposition,
 * identifies strategic pillars, generates an executive summary, and selects
 * key talking points — all designed to give the user confidence and clarity.
 */
export function generateApplicationStrategy(
  tailoredBullets: string[],
  jobTitle?: string,
  jobDescription?: string
): ApplicationStrategy {
  if (tailoredBullets.length === 0) {
    return {
      valueProposition: 'Complete your CV tailoring to generate your winning strategy.',
      strategicPillars: [],
      executiveSummary: '',
      talkingPoints: [],
      successProbability: 0,
      confidenceLabel: 'Insufficient Data',
      tailoredScore: 0,
    }
  }

  const combined = tailoredBullets.join(' ')
  const analysis = analyzeCVContent(combined, jobTitle)
  const pmAnalysis = analyzeWithPMPrinciples(combined)
  const isProductRoleFlag = jobTitle ? isProductRole(jobTitle) : false
  const roleLabel = jobTitle || 'this role'

  // ----- Score each principle to find top 3 -----
  const principleScores: { id: string; name: string; score: number }[] = []
  const allPrincipleIds = Object.keys(PRINCIPLE_SUB_INDICATORS)

  for (const pid of allPrincipleIds) {
    const subDefs = PRINCIPLE_SUB_INDICATORS[pid]
    const lower = combined.toLowerCase()
    const hits = subDefs.reduce((sum, sub) => {
      return sum + sub.keywords.filter(kw => lower.includes(kw)).length * sub.weight
    }, 0)
    const maxPossible = subDefs.reduce((sum, sub) => sub.keywords.length * sub.weight + sum, 0)
    const score = maxPossible > 0 ? Math.round((hits / maxPossible) * 100) : 0
    const template = PILLAR_TEMPLATES[pid]
    principleScores.push({ id: pid, name: template?.title || pid, score })
  }

  principleScores.sort((a, b) => b.score - a.score)
  const top3 = principleScores.slice(0, 3)

  // ----- Strategic Pillars -----
  const strategicPillars: StrategicPillar[] = top3.map(p => {
    const template = PILLAR_TEMPLATES[p.id]
    return {
      title: template?.title || p.name,
      description: template?.descriptionTemplate || 'A key strength demonstrated in your CV.',
      principleId: p.id,
    }
  })

  // ----- Value Proposition -----
  const pillarNames = top3.map(p => {
    const t = PILLAR_TEMPLATES[p.id]
    return t?.title || p.name
  })

  let valueProposition: string
  if (isProductRoleFlag && top3.length >= 2) {
    valueProposition = `A product leader who combines ${pillarNames[0]} with ${pillarNames[1]} — the profile ${roleLabel} teams compete for.`
  } else if (top3.length >= 2) {
    valueProposition = `A professional who bridges ${pillarNames[0]} and ${pillarNames[1]} to deliver consistent, measurable results.`
  } else {
    valueProposition = `A strong candidate whose ${pillarNames[0] || 'expertise'} aligns directly with what ${roleLabel} demands.`
  }

  // ----- Talking Points (pick strongest bullets) -----
  const talkingPoints: TalkingPoint[] = []
  const scoredBullets = tailoredBullets
    .filter(b => b.trim().length >= 20)
    .map(bullet => {
      const bulletAnalysis = analyzeCVContent(bullet, jobTitle)
      return { bullet, score: bulletAnalysis.totalScore }
    })
    .sort((a, b) => b.score - a.score)

  for (const { bullet } of scoredBullets.slice(0, 3)) {
    // Extract the most specific achievement from the bullet
    const numberMatch = bullet.match(/(\d+%|\$[\d,.]+[MKBmkb]?|\d+x|\d+\+?\s*(?:users|customers|team|people|engineers|countries|markets|clients))/i)
    const actionMatch = bullet.match(/^([A-Z][^,.]+(?:,\s[^,.]+)?)/)?.[1]

    if (numberMatch && actionMatch) {
      talkingPoints.push({
        point: `Be ready to discuss how you ${actionMatch.toLowerCase().replace(/^(led|drove|built|launched|achieved|increased|reduced|improved|designed|created|managed|delivered|spearheaded)/, '$1').trim()} — interviewers will want the story behind "${numberMatch[1]}".`,
        sourceBullet: bullet,
      })
    } else if (actionMatch) {
      talkingPoints.push({
        point: `Prepare to elaborate on how you ${actionMatch.toLowerCase().trim()} — this directly maps to what they need.`,
        sourceBullet: bullet,
      })
    }
  }

  // Ensure at least 2 talking points
  if (talkingPoints.length < 2 && scoredBullets.length > 0) {
    const fallback = scoredBullets[talkingPoints.length]
    if (fallback) {
      talkingPoints.push({
        point: `Prepare a concise version of this experience for behavioral questions.`,
        sourceBullet: fallback.bullet,
      })
    }
  }

  // ----- Executive Summary -----
  const strengthList = top3.map(p => PILLAR_TEMPLATES[p.id]?.title.toLowerCase() || p.name.toLowerCase())
  const missingCount = pmAnalysis.missingPrinciples.length

  let executiveSummary: string
  if (isProductRoleFlag) {
    executiveSummary = `As a product professional, I bring a proven combination of ${strengthList[0]} and ${strengthList[1] || 'strategic execution'}. `
    executiveSummary += `My track record demonstrates consistent delivery of business outcomes — from ${scoredBullets[0]?.bullet.substring(0, 60).trim() || 'driving measurable impact'}... `
    executiveSummary += `I am particularly well-suited for ${roleLabel} because my approach integrates ${strengthList[2] || 'cross-functional collaboration'} with a relentless focus on user value. `
    if (missingCount <= 2) {
      executiveSummary += 'I look forward to bringing this same impact-driven mindset to your team.'
    } else {
      executiveSummary += 'I am eager to grow further and apply my strengths to your product challenges.'
    }
  } else {
    executiveSummary = `I am a ${roleLabel} professional whose core strengths in ${strengthList[0]} and ${strengthList[1] || 'execution'} drive measurable results. `
    executiveSummary += `My experience spans ${scoredBullets[0]?.bullet.substring(0, 60).trim() || 'delivering impactful work'}... `
    executiveSummary += `With a focus on ${strengthList[2] || 'continuous improvement'}, I bring both the technical depth and the strategic perspective this role requires. `
    executiveSummary += 'I am excited to contribute to your team and deliver meaningful outcomes.'
  }

  // ----- Success Probability -----
  const tailoredScore = analysis.totalScore
  // Map 0-100 internal score to a success probability range (30-95%)
  const successProbability = Math.min(95, Math.max(30, Math.round(tailoredScore * 0.65 + 30)))

  let confidenceLabel: string
  if (successProbability >= 80) confidenceLabel = 'Excellent Match'
  else if (successProbability >= 65) confidenceLabel = 'Strong Match'
  else if (successProbability >= 50) confidenceLabel = 'Good Match'
  else confidenceLabel = 'Developing'

  return {
    valueProposition,
    strategicPillars,
    executiveSummary,
    talkingPoints: talkingPoints.slice(0, 3),
    successProbability,
    confidenceLabel,
    tailoredScore,
  }
}

// ---------------------------------------------------------------------------
// Strategic Narrative Alignment — Compass profile + Semantic Gap Analysis
// ---------------------------------------------------------------------------

export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'executive'
export type CoreStrength = 'strategic-leadership' | 'technical-mastery' | 'operational-excellence' | 'business-innovation'

export interface NarrativeProfile {
  /** "What is your next career target?" */
  targetRole: string
  /** Current seniority level */
  seniorityLevel: SeniorityLevel
  /** Professional superpower */
  coreStrength: CoreStrength
  /** Biggest career hurdle */
  painPoint: string
  /** One-sentence desired recruiter perception */
  desiredBrand: string
}

/** A single piece of evidence explaining the match score */
export interface NarrativeEvidence {
  /** What was measured */
  dimension: string
  /** What the desired brand requires */
  desired: string
  /** What the CV actually signals */
  actual: string
  /** Contribution to match score (positive or 0) */
  contribution: number
  /** Maximum possible contribution for this dimension */
  maxContribution: number
}

export interface NarrativeAnalysisResult {
  /** Detected archetype from the CV text (e.g., "Execution-Oriented Specialist") */
  detectedArchetype: string
  /** Short description of the detected archetype */
  archetypeDescription: string
  /** Narrative Match % (0-100) — derived from semantic overlap, NOT hardcoded */
  narrativeMatchPercent: number
  /** Evidence items explaining why this score */
  evidence: NarrativeEvidence[]
  /** Top keywords found in CV that align with desired brand */
  alignedKeywords: string[]
  /** Keywords expected from desired brand/role but missing in CV */
  missingKeywords: string[]
  /** Overall 4-stage score of the CV */
  cvScore: number
}

// ---------------------------------------------------------------------------
// Archetype detection — maps verb/keyword patterns to archetypes
// ---------------------------------------------------------------------------

const ARCHETYPE_PROFILES: {
  id: string
  name: string
  description: string
  keywords: string[]
  verbs: string[]
}[] = [
  {
    id: 'strategic-leader',
    name: 'Strategic Leader',
    description: 'Your CV signals someone who sets direction, influences stakeholders, and aligns teams around a vision.',
    keywords: ['strategy', 'strategic', 'vision', 'roadmap', 'stakeholder', 'executive', 'c-suite', 'board', 'alignment', 'initiative'],
    verbs: ['led', 'directed', 'influenced', 'aligned', 'championed', 'spearheaded', 'orchestrated'],
  },
  {
    id: 'execution-specialist',
    name: 'Execution-Oriented Specialist',
    description: 'Your CV signals a high-output doer who ships fast, manages processes, and delivers reliably.',
    keywords: ['delivered', 'shipped', 'launched', 'sprint', 'agile', 'deployment', 'pipeline', 'automation', 'ci/cd', 'release'],
    verbs: ['built', 'implemented', 'deployed', 'shipped', 'launched', 'automated', 'managed', 'maintained'],
  },
  {
    id: 'data-analyst',
    name: 'Data-Driven Analyst',
    description: 'Your CV signals someone who lets numbers tell the story — metrics, A/B tests, and analytical rigor.',
    keywords: ['data', 'analytics', 'metrics', 'kpi', 'a/b', 'experiment', 'analysis', 'measured', 'dashboards', 'insights'],
    verbs: ['analyzed', 'measured', 'tracked', 'optimized', 'tested', 'validated', 'quantified'],
  },
  {
    id: 'user-champion',
    name: 'User-Centric Champion',
    description: 'Your CV signals deep empathy — user research, feedback loops, and experience-driven decisions.',
    keywords: ['user', 'customer', 'research', 'interview', 'feedback', 'usability', 'experience', 'satisfaction', 'nps', 'persona'],
    verbs: ['researched', 'interviewed', 'discovered', 'advocated', 'designed', 'improved'],
  },
  {
    id: 'technical-architect',
    name: 'Technical Architect',
    description: 'Your CV signals systems-level thinking — architecture decisions, scalability, and engineering depth.',
    keywords: ['architecture', 'system', 'platform', 'api', 'infrastructure', 'scalability', 'performance', 'database', 'microservices', 'technical'],
    verbs: ['architected', 'designed', 'engineered', 'integrated', 'migrated', 'optimized', 'scaled'],
  },
  {
    id: 'growth-driver',
    name: 'Growth & Business Driver',
    description: 'Your CV signals commercial instinct — revenue impact, market expansion, and growth metrics.',
    keywords: ['revenue', 'growth', 'conversion', 'acquisition', 'retention', 'market', 'pricing', 'monetization', 'roi', 'profit'],
    verbs: ['grew', 'increased', 'expanded', 'monetized', 'accelerated', 'generated', 'captured'],
  },
  {
    id: 'cross-functional-collaborator',
    name: 'Cross-Functional Collaborator',
    description: 'Your CV signals strong collaboration — bridging teams, facilitating alignment, and driving consensus.',
    keywords: ['cross-functional', 'collaboration', 'team', 'partners', 'engineering', 'design', 'marketing', 'sales', 'operations'],
    verbs: ['collaborated', 'partnered', 'facilitated', 'coordinated', 'bridged', 'unified'],
  },
]

// Semantic dimensions: what we measure in the match calculation
const NARRATIVE_DIMENSIONS: {
  id: string
  dimension: string
  strengthMap: Record<CoreStrength, string[]>
  seniorityMap: Record<SeniorityLevel, string[]>
}[] = [
  {
    id: 'verb-strength',
    dimension: 'Action Verb Strength',
    strengthMap: {
      'strategic-leadership': ['led', 'directed', 'influenced', 'aligned', 'championed', 'spearheaded', 'orchestrated', 'defined', 'envisioned'],
      'technical-mastery': ['architected', 'engineered', 'designed', 'built', 'implemented', 'optimized', 'scaled', 'integrated', 'debugged'],
      'operational-excellence': ['streamlined', 'automated', 'shipped', 'delivered', 'managed', 'maintained', 'deployed', 'launched', 'executed'],
      'business-innovation': ['grew', 'increased', 'monetized', 'innovated', 'disrupted', 'expanded', 'generated', 'captured', 'transformed'],
    },
    seniorityMap: {
      junior: ['assisted', 'supported', 'contributed', 'helped', 'participated'],
      mid: ['managed', 'built', 'implemented', 'developed', 'created'],
      senior: ['led', 'drove', 'designed', 'owned', 'delivered', 'spearheaded'],
      executive: ['directed', 'transformed', 'defined', 'established', 'championed', 'orchestrated'],
    },
  },
  {
    id: 'achievement-keywords',
    dimension: 'Achievement & Impact Keywords',
    strengthMap: {
      'strategic-leadership': ['strategy', 'vision', 'roadmap', 'stakeholder', 'alignment', 'initiative', 'prioritization', 'executive', 'board'],
      'technical-mastery': ['architecture', 'system', 'api', 'platform', 'performance', 'scalability', 'infrastructure', 'technical', 'latency'],
      'operational-excellence': ['process', 'efficiency', 'delivery', 'sprint', 'agile', 'pipeline', 'automation', 'deployment', 'quality'],
      'business-innovation': ['revenue', 'growth', 'market', 'conversion', 'acquisition', 'roi', 'profit', 'pricing', 'innovation'],
    },
    seniorityMap: {
      junior: ['team', 'project', 'task', 'feature'],
      mid: ['product', 'initiative', 'program', 'platform'],
      senior: ['portfolio', 'organization', 'department', 'business unit'],
      executive: ['company', 'enterprise', 'division', 'board', 'p&l'],
    },
  },
  {
    id: 'quantification',
    dimension: 'Quantified Results',
    strengthMap: {
      'strategic-leadership': ['%', '$', 'team of', 'stakeholders', 'departments'],
      'technical-mastery': ['ms', 'latency', 'uptime', '99.', 'requests', 'throughput'],
      'operational-excellence': ['time', 'hours', 'days', 'sprint', 'cycle', 'delivery'],
      'business-innovation': ['$', '%', 'revenue', 'arr', 'mrr', 'users', 'customers', 'conversion'],
    },
    seniorityMap: {
      junior: [],
      mid: ['%', 'users', 'team'],
      senior: ['$', '%', 'million', 'thousand', 'team of'],
      executive: ['$', 'million', 'billion', 'revenue', 'p&l', 'headcount'],
    },
  },
  {
    id: 'brand-language',
    dimension: 'Brand-Aligned Language',
    strengthMap: {
      'strategic-leadership': ['influence', 'vision', 'direction', 'north star', 'charter', 'mandate'],
      'technical-mastery': ['deep dive', 'root cause', 'trade-off', 'feasibility', 'poc', 'prototype'],
      'operational-excellence': ['sla', 'playbook', 'runbook', 'standard', 'framework', 'best practice'],
      'business-innovation': ['disruption', 'blue ocean', 'first mover', 'moat', 'flywheel', 'network effect'],
    },
    seniorityMap: {
      junior: [],
      mid: [],
      senior: ['owned', 'accountability', 'impact'],
      executive: ['transformation', 'turnaround', 'cultural', 'organizational'],
    },
  },
]

/**
 * Detect the strongest archetype from CV text.
 * Uses weighted keyword + verb matching across all archetype profiles.
 * Returns the top archetype and runner-up.
 */
function detectArchetype(cvText: string): { primary: typeof ARCHETYPE_PROFILES[0]; score: number } {
  const lower = cvText.toLowerCase()

  const scored = ARCHETYPE_PROFILES.map(profile => {
    const keywordHits = profile.keywords.filter(kw => lower.includes(kw)).length
    const verbHits = profile.verbs.filter(v => lower.includes(v)).length
    // Verbs weighted 1.5x because they signal active contribution
    const score = keywordHits + verbHits * 1.5
    return { profile, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return { primary: scored[0].profile, score: scored[0].score }
}

/**
 * Extract keywords from the desired brand statement + target role.
 * These represent what the user WANTS to be seen as.
 */
function extractDesiredKeywords(profile: NarrativeProfile): string[] {
  const text = `${profile.desiredBrand} ${profile.targetRole} ${profile.painPoint}`.toLowerCase()
  const words = text.split(/[\s,.;:!?()[\]{}\/\-]+/).filter(w => w.length >= 3)

  // Combine with strength-specific keywords
  const strengthKeywords: Record<CoreStrength, string[]> = {
    'strategic-leadership': ['strategy', 'leadership', 'vision', 'influence', 'stakeholder', 'direction', 'executive', 'alignment'],
    'technical-mastery': ['technical', 'architecture', 'engineering', 'system', 'platform', 'scalable', 'performance', 'infrastructure'],
    'operational-excellence': ['operations', 'process', 'efficiency', 'delivery', 'quality', 'automation', 'agile', 'continuous'],
    'business-innovation': ['business', 'innovation', 'growth', 'revenue', 'market', 'disruption', 'product', 'commercial'],
  }

  const allDesired = new Set([
    ...words.filter(w => !['the', 'and', 'for', 'who', 'that', 'with', 'can', 'has', 'was', 'are', 'not', 'but'].includes(w)),
    ...strengthKeywords[profile.coreStrength],
  ])

  return Array.from(allDesired)
}

/**
 * Analyze the semantic gap between a user's Desired Narrative Profile
 * and what their CV actually signals.
 *
 * The match % is computed from real semantic overlap — NOT hardcoded.
 * Each dimension contributes a measurable, evidence-backed score.
 */
export function analyzeNarrativeGap(
  cvBullets: string[],
  profile: NarrativeProfile
): NarrativeAnalysisResult {
  if (cvBullets.length === 0) {
    return {
      detectedArchetype: 'Unknown',
      archetypeDescription: 'No CV content provided for analysis.',
      narrativeMatchPercent: 0,
      evidence: [],
      alignedKeywords: [],
      missingKeywords: [],
      cvScore: 0,
    }
  }

  const combined = cvBullets.join(' ')
  const lower = combined.toLowerCase()
  const cvAnalysis = analyzeCVContent(combined, profile.targetRole)

  // ----- Step 1: Detect archetype -----
  const { primary: archetype } = detectArchetype(combined)

  // ----- Step 2: Compute dimensional match -----
  const evidence: NarrativeEvidence[] = []
  let totalEarned = 0
  let totalPossible = 0

  for (const dim of NARRATIVE_DIMENSIONS) {
    const strengthWords = dim.strengthMap[profile.coreStrength] || []
    const seniorityWords = dim.seniorityMap[profile.seniorityLevel] || []
    const desiredWords = [...new Set([...strengthWords, ...seniorityWords])]

    if (desiredWords.length === 0) continue

    const maxContribution = 25 // Each of 4 dimensions can contribute up to 25 points
    const foundWords = desiredWords.filter(w => lower.includes(w))
    const ratio = foundWords.length / desiredWords.length
    const contribution = Math.round(ratio * maxContribution)

    totalEarned += contribution
    totalPossible += maxContribution

    // Build evidence description
    const desiredLabel = strengthWords.slice(0, 3).join(', ')
    const actualLabel = foundWords.length > 0
      ? `Found ${foundWords.length}: ${foundWords.slice(0, 4).join(', ')}`
      : 'No matching keywords found'

    evidence.push({
      dimension: dim.dimension,
      desired: `Expects: ${desiredLabel}${strengthWords.length > 3 ? ` +${strengthWords.length - 3} more` : ''}`,
      actual: actualLabel,
      contribution,
      maxContribution,
    })
  }

  // ----- Step 3: Desired brand semantic overlap -----
  const desiredKeywords = extractDesiredKeywords(profile)
  const alignedKeywords = desiredKeywords.filter(kw => lower.includes(kw))
  const missingKeywords = desiredKeywords.filter(kw => !lower.includes(kw) && kw.length >= 4)

  // Brand overlap bonus (up to 10 extra points)
  const brandOverlapRatio = desiredKeywords.length > 0
    ? alignedKeywords.length / desiredKeywords.length
    : 0
  const brandBonus = Math.round(brandOverlapRatio * 10)

  // ----- Step 4: Seniority alignment check -----
  const seniorityVerbs = NARRATIVE_DIMENSIONS[0].seniorityMap[profile.seniorityLevel] || []
  const seniorityFound = seniorityVerbs.filter(v => lower.includes(v)).length
  const seniorityMax = Math.max(seniorityVerbs.length, 1)
  const seniorityBonus = Math.round((seniorityFound / seniorityMax) * 5)

  // ----- Final calculation -----
  // totalPossible (100) + brandBonus (10) + seniorityBonus (5) = 115 max
  // Normalize to 0-100
  const rawMatch = totalEarned + brandBonus + seniorityBonus
  const maxPossible = totalPossible + 10 + 5
  const narrativeMatchPercent = maxPossible > 0
    ? Math.min(100, Math.max(0, Math.round((rawMatch / maxPossible) * 100)))
    : 0

  return {
    detectedArchetype: archetype.name,
    archetypeDescription: archetype.description,
    narrativeMatchPercent,
    evidence,
    alignedKeywords: alignedKeywords.slice(0, 15),
    missingKeywords: missingKeywords.slice(0, 10),
    cvScore: cvAnalysis.totalScore,
  }
}

// ---------------------------------------------------------------------------
// Narrative-Driven Bullet Tailoring — "Identity Transformation"
// ---------------------------------------------------------------------------

// Maps CoreStrength to the archetype the user wants to embody
const STRENGTH_TO_ARCHETYPE: Record<CoreStrength, string> = {
  'strategic-leadership': 'strategic-leader',
  'technical-mastery': 'technical-architect',
  'operational-excellence': 'execution-specialist',
  'business-innovation': 'growth-driver',
}

// Verb upgrade tables: maps weak/generic verbs to narrative-aligned power verbs
const NARRATIVE_VERB_UPGRADES: Record<CoreStrength, Record<string, string>> = {
  'strategic-leadership': {
    'managed': 'directed',
    'worked on': 'spearheaded',
    'helped': 'championed',
    'did': 'orchestrated',
    'participated in': 'led',
    'was responsible for': 'drove',
    'made': 'influenced',
    'handled': 'aligned',
    'created': 'established',
    'ran': 'directed',
    'built': 'architected the strategy for',
    'supported': 'championed',
    'maintained': 'governed',
    'used': 'leveraged',
    'improved': 'transformed',
  },
  'technical-mastery': {
    'managed': 'engineered',
    'worked on': 'architected',
    'helped': 'designed',
    'did': 'implemented',
    'participated in': 'built',
    'was responsible for': 'engineered',
    'made': 'designed',
    'handled': 'optimized',
    'created': 'engineered',
    'ran': 'operated',
    'supported': 'integrated',
    'maintained': 'scaled',
    'used': 'leveraged',
    'improved': 'optimized',
  },
  'operational-excellence': {
    'managed': 'streamlined',
    'worked on': 'delivered',
    'helped': 'automated',
    'did': 'shipped',
    'participated in': 'executed',
    'was responsible for': 'delivered',
    'made': 'launched',
    'handled': 'streamlined',
    'created': 'deployed',
    'ran': 'operated',
    'supported': 'maintained',
    'maintained': 'standardized',
    'used': 'implemented',
    'improved': 'streamlined',
  },
  'business-innovation': {
    'managed': 'grew',
    'worked on': 'monetized',
    'helped': 'accelerated',
    'did': 'generated',
    'participated in': 'drove',
    'was responsible for': 'captured',
    'made': 'innovated',
    'handled': 'expanded',
    'created': 'launched',
    'ran': 'scaled',
    'supported': 'enabled',
    'maintained': 'sustained',
    'used': 'leveraged',
    'improved': 'increased',
  },
}

// Narrative enrichment phrases per strength
const NARRATIVE_ENRICHMENTS: Record<CoreStrength, string[]> = {
  'strategic-leadership': [
    'aligning cross-functional stakeholders',
    'defining the strategic roadmap',
    'securing executive buy-in',
    'setting long-term vision',
    'influencing organizational direction',
  ],
  'technical-mastery': [
    'evaluating architectural trade-offs',
    'designing for scalability',
    'ensuring system reliability',
    'reducing technical debt',
    'driving engineering excellence',
  ],
  'operational-excellence': [
    'achieving on-time delivery',
    'reducing cycle time',
    'automating manual processes',
    'establishing quality frameworks',
    'ensuring operational continuity',
  ],
  'business-innovation': [
    'driving revenue growth',
    'capturing new market segments',
    'improving conversion funnels',
    'maximizing customer lifetime value',
    'accelerating go-to-market velocity',
  ],
}

/**
 * Score a single bullet's narrative alignment against a NarrativeProfile.
 * Returns 0-100 representing how well this bullet matches the desired archetype.
 *
 * This uses the same dimensional scoring as analyzeNarrativeGap but on a
 * single bullet — enabling per-bullet narrative scoring during tailoring.
 */
export function scoreNarrativeAlignment(
  bullet: string,
  profile: NarrativeProfile
): number {
  if (!bullet || bullet.trim().length === 0) return 0

  const lower = bullet.toLowerCase()
  let earned = 0
  let possible = 0

  for (const dim of NARRATIVE_DIMENSIONS) {
    const strengthWords = dim.strengthMap[profile.coreStrength] || []
    const seniorityWords = dim.seniorityMap[profile.seniorityLevel] || []
    const desiredWords = [...new Set([...strengthWords, ...seniorityWords])]
    if (desiredWords.length === 0) continue

    const maxContribution = 25
    const foundWords = desiredWords.filter(w => lower.includes(w))
    earned += Math.round((foundWords.length / desiredWords.length) * maxContribution)
    possible += maxContribution
  }

  return possible > 0 ? Math.min(100, Math.round((earned / possible) * 100)) : 0
}

/**
 * Rewrite a bullet to close the narrative gap.
 *
 * Uses verb upgrades, outcome-framing, and narrative enrichment phrases
 * to transform the bullet so it sounds like the candidate is already in
 * their target role.
 *
 * The rewriting is deterministic (no LLM call) — it applies rule-based
 * transformations that are verifiable and transparent.
 */
export function tailorBulletForNarrative(
  bullet: string,
  profile: NarrativeProfile
): string {
  if (!bullet || bullet.trim().length === 0) return bullet

  let result = bullet
  const verbUpgrades = NARRATIVE_VERB_UPGRADES[profile.coreStrength] || {}

  // Step 1: Verb upgrade — replace weak verbs with archetype-aligned power verbs
  // Sort by length (longest first) to avoid partial replacements
  const verbEntries = Object.entries(verbUpgrades).sort((a, b) => b[0].length - a[0].length)
  for (const [weak, strong] of verbEntries) {
    // Match at start of bullet (case-insensitive) or after common separators
    const regex = new RegExp(`(^|(?:,\\s|;\\s|\\band\\s))${weak.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    result = result.replace(regex, (match, prefix) => {
      // Preserve original capitalization pattern
      const isCapitalized = match.charAt(prefix.length) === match.charAt(prefix.length).toUpperCase()
      const replacement = isCapitalized ? strong.charAt(0).toUpperCase() + strong.slice(1) : strong
      return prefix + replacement
    })
  }

  // Step 2: Add outcome framing if bullet lacks results language
  const hasOutcome = /\b(resulting in|leading to|achieving|which led|thereby|delivering|driving|improving)\b/i.test(result)
  const hasMetric = /\d+%|\$\d+|\d+x|\d+ (users|customers|people|team|engineers|stakeholders)/.test(result)

  if (!hasOutcome && !hasMetric) {
    // Add a narrative-appropriate enrichment
    const enrichments = NARRATIVE_ENRICHMENTS[profile.coreStrength] || []
    if (enrichments.length > 0) {
      // Pick enrichment based on bullet content hash for consistency
      const hash = bullet.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      const enrichment = enrichments[Math.abs(hash) % enrichments.length]
      // Only append if the bullet doesn't already end with similar language
      if (!result.toLowerCase().includes(enrichment.split(' ')[0])) {
        result = result.replace(/\.?\s*$/, `, ${enrichment}`)
      }
    }
  }

  // Step 3: Seniority-appropriate framing
  if (profile.seniorityLevel === 'executive' || profile.seniorityLevel === 'senior') {
    // Upgrade team references to show scale
    result = result.replace(/\bthe team\b/gi, 'a cross-functional team')
    result = result.replace(/\bmy team\b/gi, 'a cross-functional team')
  }

  return result
}

/**
 * Analyze a tailoring pair with narrative context.
 *
 * Extends analyzeTailoringPair with:
 * - Narrative alignment scoring (before/after)
 * - Narrative boost calculation
 * - Top Pick classification (suggestion increases narrative alignment)
 * - Human-readable boost label
 *
 * The narrative profile and gap analysis are injected as context, ensuring
 * the tailoring engine considers identity transformation, not just keywords.
 */
export function analyzeTailoringPairWithNarrative(
  originalBullet: string,
  suggestedBullet: string,
  jobKeywords: string[],
  profile: NarrativeProfile,
  jobTitle?: string
): TailoringAnalysis {
  // Get base JD-focused analysis
  const base = analyzeTailoringPair(originalBullet, suggestedBullet, jobKeywords, jobTitle)

  // Score narrative alignment for both
  const originalNarrative = scoreNarrativeAlignment(originalBullet, profile)
  const suggestedNarrative = scoreNarrativeAlignment(suggestedBullet, profile)
  const narrativeBoost = suggestedNarrative - originalNarrative

  // Determine archetype name for the boost label
  const targetArchetypeId = STRENGTH_TO_ARCHETYPE[profile.coreStrength]
  const targetArchetype = ARCHETYPE_PROFILES.find(a => a.id === targetArchetypeId)
  const archetypeName = targetArchetype?.name || profile.coreStrength.replace(/-/g, ' ')

  // Build narrative boost label based on what improved
  let narrativeBoostLabel = ''
  if (narrativeBoost > 15) {
    narrativeBoostLabel = `Strong ${archetypeName} Signal`
  } else if (narrativeBoost > 5) {
    narrativeBoostLabel = `Boosts ${archetypeName.split(' ')[0]} Signal`
  } else if (narrativeBoost > 0) {
    narrativeBoostLabel = `Slight Narrative Lift`
  }

  // Top Pick = increases narrative alignment AND doesn't degrade JD score
  const isNarrativeTopPick = narrativeBoost > 5 && base.scoreDelta >= 0

  return {
    ...base,
    narrativeBoost,
    narrativeMatchPercent: suggestedNarrative,
    originalNarrativePercent: originalNarrative,
    isNarrativeTopPick,
    narrativeBoostLabel,
  }
}

/**
 * Full narrative-driven tailoring pipeline for a set of bullets.
 *
 * For each original bullet:
 * 1. Rewrites it using tailorBulletForNarrative (verb upgrades + enrichment)
 * 2. Scores against both JD alignment and Narrative alignment
 * 3. Verifies narrative needle movement via analyzeNarrativeGap on the full set
 * 4. Classifies as Top Pick if it increases narrative alignment
 *
 * Returns the same BulletState-compatible structure with narrative fields.
 */
export function tailorBulletsWithNarrative(
  originalBullets: string[],
  suggestedBullets: string[],
  jobKeywords: string[],
  profile: NarrativeProfile,
  jobTitle?: string
): {
  analyses: TailoringAnalysis[]
  originalNarrativePercent: number
  suggestedNarrativePercent: number
  narrativeDelta: number
} {
  const maxLen = Math.max(originalBullets.length, suggestedBullets.length)
  const analyses: TailoringAnalysis[] = []

  // First pass: analyze each pair with narrative context
  for (let i = 0; i < maxLen; i++) {
    const original = originalBullets[i] || ''
    const suggested = suggestedBullets[i] || original

    const analysis = analyzeTailoringPairWithNarrative(
      original,
      suggested,
      jobKeywords,
      profile,
      jobTitle
    )

    analyses.push(analysis)
  }

  // Second pass: verify full-set narrative movement using analyzeNarrativeGap
  const originalNarrative = analyzeNarrativeGap(originalBullets, profile)
  const suggestedNarrative = analyzeNarrativeGap(suggestedBullets, profile)

  return {
    analyses,
    originalNarrativePercent: originalNarrative.narrativeMatchPercent,
    suggestedNarrativePercent: suggestedNarrative.narrativeMatchPercent,
    narrativeDelta: suggestedNarrative.narrativeMatchPercent - originalNarrative.narrativeMatchPercent,
  }
}

// =========================================================================
// Narrative Transformation Summary
// =========================================================================

/**
 * Result of the narrative transformation analysis — the "victory lap" data.
 *
 * Shows the user exactly how their professional identity shifted from
 * original to tailored CV.
 */
export interface NarrativeTransformationSummary {
  beforeArchetype: { id: string; name: string; percent: number }
  afterArchetype: { id: string; name: string; percent: number }
  narrativeShift: string
  leadershipSignalDelta: number
  jdAlignmentMaintained: boolean
  jdScore: number
  successSummary: string
  dimensionShifts: {
    dimension: string
    before: number
    after: number
    delta: number
  }[]
  topTransformations: {
    original: string
    transformed: string
    boostLabel: string
  }[]
}

/**
 * Tone nudge options the user can pick when they say "this doesn't feel authentic."
 */
export type ToneNudge = 'more-technical' | 'more-visionary' | 'more-collaborative' | 'more-results-driven'

const TONE_NUDGE_STRENGTH_MAP: Record<ToneNudge, CoreStrength> = {
  'more-technical': 'technical-mastery',
  'more-visionary': 'strategic-leadership',
  'more-collaborative': 'operational-excellence',
  'more-results-driven': 'business-innovation',
}

/**
 * Generate the full narrative transformation summary.
 *
 * This is the "victory lap" — comparing original vs tailored bullets
 * to show how the candidate's professional identity has shifted.
 *
 * Uses real archetype detection + narrative gap analysis (NO faking).
 */
export function generateNarrativeTransformationSummary(
  originalBullets: string[],
  tailoredBullets: string[],
  profile: NarrativeProfile,
  jdScore: number,
  originalJdScore: number
): NarrativeTransformationSummary {
  // 1. Detect archetypes before and after
  const originalText = originalBullets.join(' ')
  const tailoredText = tailoredBullets.join(' ')

  const beforeDetection = detectArchetype(originalText)
  const afterDetection = detectArchetype(tailoredText)

  // 2. Full narrative gap analysis before and after
  const beforeNarrative = analyzeNarrativeGap(originalBullets, profile)
  const afterNarrative = analyzeNarrativeGap(tailoredBullets, profile)

  // 3. Calculate per-dimension shifts
  const dimensionShifts = beforeNarrative.evidence.map((ev, idx) => {
    const afterEv = afterNarrative.evidence[idx]
    const beforePct = ev.maxContribution > 0 ? Math.round((ev.contribution / ev.maxContribution) * 100) : 0
    const afterPct = afterEv && afterEv.maxContribution > 0
      ? Math.round((afterEv.contribution / afterEv.maxContribution) * 100) : 0
    return {
      dimension: ev.dimension,
      before: beforePct,
      after: afterPct,
      delta: afterPct - beforePct,
    }
  })

  // 4. Find top transformations (bullets with biggest narrative boost)
  const topTransformations: NarrativeTransformationSummary['topTransformations'] = []
  const maxLen = Math.min(originalBullets.length, tailoredBullets.length)
  const boosts: { idx: number; boost: number }[] = []

  for (let i = 0; i < maxLen; i++) {
    const origScore = scoreNarrativeAlignment(originalBullets[i], profile)
    const tailScore = scoreNarrativeAlignment(tailoredBullets[i], profile)
    boosts.push({ idx: i, boost: tailScore - origScore })
  }

  boosts.sort((a, b) => b.boost - a.boost)
  const topCount = Math.min(3, boosts.length)
  for (let i = 0; i < topCount; i++) {
    const { idx, boost } = boosts[i]
    if (boost <= 0) break
    const targetArchetypeId = STRENGTH_TO_ARCHETYPE[profile.coreStrength]
    const targetArchetype = ARCHETYPE_PROFILES.find(a => a.id === targetArchetypeId)
    const archetypeName = targetArchetype?.name || profile.coreStrength.replace(/-/g, ' ')
    topTransformations.push({
      original: originalBullets[idx],
      transformed: tailoredBullets[idx],
      boostLabel: boost > 15 ? `Strong ${archetypeName} Signal` : `+${boost}% Narrative Lift`,
    })
  }

  // 5. Build narrative shift description
  const narrativeDelta = afterNarrative.narrativeMatchPercent - beforeNarrative.narrativeMatchPercent
  const jdMaintained = jdScore >= originalJdScore

  const targetArchetypeId = STRENGTH_TO_ARCHETYPE[profile.coreStrength]
  const targetArchetype = ARCHETYPE_PROFILES.find(a => a.id === targetArchetypeId)
  const targetName = targetArchetype?.name || 'Target Archetype'

  const narrativeShift = narrativeDelta > 0
    ? `We increased your ${targetName.toLowerCase()} signal by ${narrativeDelta}%${jdMaintained ? ' while maintaining 100% JD alignment' : ''}.`
    : 'Your narrative alignment is consistent with the original.'

  // 6. Build success summary (the CPO's "feel ready to lead" moment)
  const successParts: string[] = []

  if (afterNarrative.narrativeMatchPercent >= 70) {
    successParts.push(`Your CV now projects a clear ${targetName} identity at ${afterNarrative.narrativeMatchPercent}% alignment`)
  } else if (afterNarrative.narrativeMatchPercent >= 45) {
    successParts.push(`Your ${targetName.toLowerCase()} signal has grown to ${afterNarrative.narrativeMatchPercent}%`)
  } else {
    successParts.push(`Your narrative alignment is at ${afterNarrative.narrativeMatchPercent}%`)
  }

  if (narrativeDelta > 20) {
    successParts.push(`a ${narrativeDelta}-point transformation from your original CV`)
  } else if (narrativeDelta > 0) {
    successParts.push(`up ${narrativeDelta} points from where you started`)
  }

  if (jdMaintained) {
    successParts.push('with full job description alignment preserved')
  }

  const leadershipDim = dimensionShifts.find(d => d.dimension === 'Action Verb Strength')
  const leadershipDelta = leadershipDim?.delta || 0

  return {
    beforeArchetype: {
      id: beforeDetection.primary.id,
      name: beforeDetection.primary.name,
      percent: beforeNarrative.narrativeMatchPercent,
    },
    afterArchetype: {
      id: afterDetection.primary.id,
      name: afterDetection.primary.name,
      percent: afterNarrative.narrativeMatchPercent,
    },
    narrativeShift,
    leadershipSignalDelta: leadershipDelta,
    jdAlignmentMaintained: jdMaintained,
    jdScore,
    successSummary: successParts.join(' — ') + '.',
    dimensionShifts,
    topTransformations,
  }
}

/**
 * Re-tailor bullets with a tone nudge.
 *
 * When the user says "this doesn't feel authentic," they pick a tone
 * direction. We create a modified profile with the nudged strength
 * and re-run tailoring.
 */
export function retailorWithToneNudge(
  bullets: string[],
  originalProfile: NarrativeProfile,
  nudge: ToneNudge
): string[] {
  const nudgedStrength = TONE_NUDGE_STRENGTH_MAP[nudge]
  const nudgedProfile: NarrativeProfile = {
    ...originalProfile,
    coreStrength: nudgedStrength,
  }

  return bullets.map(bullet => tailorBulletForNarrative(bullet, nudgedProfile))
}

/**
 * Format bullets for PDF export with seniority framing applied.
 *
 * Applies the same seniority rules from Phase 2 to ensure the final
 * exported document uses consistent tone:
 * - Executive/Senior: "a cross-functional team" framing
 * - Verb upgrades for target strength
 * - Enrichment phrases for bullets lacking outcomes
 *
 * Returns formatted text with section headers and bullet markers.
 */
export function formatBulletsForPDFExport(
  bullets: string[],
  profile: NarrativeProfile,
  jobTitle: string,
  candidateName?: string
): string {
  // Apply narrative tailoring to ensure seniority framing
  const framedBullets = bullets.map(b => tailorBulletForNarrative(b, profile))

  const lines: string[] = []

  // Header
  if (candidateName) {
    lines.push(candidateName.toUpperCase())
    lines.push('')
  }
  lines.push(`${profile.targetRole || jobTitle}`)
  lines.push(`${profile.seniorityLevel.charAt(0).toUpperCase() + profile.seniorityLevel.slice(1)}-Level Professional`)
  lines.push('')

  // Narrative positioning statement
  if (profile.desiredBrand) {
    lines.push('PROFESSIONAL SUMMARY')
    lines.push(profile.desiredBrand)
    lines.push('')
  }

  // Experience bullets
  lines.push('KEY ACHIEVEMENTS')
  framedBullets.forEach(b => {
    lines.push(`• ${b}`)
  })
  lines.push('')

  // Footer with metadata
  const targetArchetypeId = STRENGTH_TO_ARCHETYPE[profile.coreStrength]
  const targetArchetype = ARCHETYPE_PROFILES.find(a => a.id === targetArchetypeId)
  lines.push(`Profile: ${targetArchetype?.name || profile.coreStrength} | Seniority: ${profile.seniorityLevel}`)

  return lines.join('\n')
}

// =========================================================================
// Strategic Interview Wizard — "Thinking Engine"
// =========================================================================

import type {
  StrategicWizardConfig,
  InterviewerValues,
  PreparedInterviewSession,
  InterviewerPersonality,
} from '@/types/interview'

// Keyword dictionaries for LinkedIn values extraction
const VALUES_KEYWORDS: Record<string, string[]> = {
  'data-driven': ['data', 'metrics', 'analytics', 'kpi', 'a/b', 'experiment', 'measure', 'quantitative', 'evidence'],
  'people-first': ['people', 'team', 'culture', 'empathy', 'mentoring', 'coaching', 'development', 'inclusion', 'diversity'],
  'execution': ['ship', 'deliver', 'execute', 'agile', 'sprint', 'velocity', 'deadline', 'ops', 'operational'],
  'innovation': ['innovation', 'disrupt', 'creative', 'experiment', 'prototype', 'mvp', 'iterate', 'pivot', 'new'],
  'growth': ['growth', 'revenue', 'acquisition', 'retention', 'conversion', 'funnel', 'scale', 'expand', 'market'],
  'technical': ['engineer', 'architecture', 'system', 'infrastructure', 'platform', 'api', 'code', 'technical', 'stack'],
  'strategic': ['strategy', 'vision', 'roadmap', 'initiative', 'alignment', 'stakeholder', 'board', 'executive', 'long-term'],
  'customer': ['customer', 'user', 'feedback', 'research', 'interview', 'persona', 'journey', 'experience', 'satisfaction'],
}

const COMMUNICATION_STYLES: { pattern: RegExp; style: string }[] = [
  { pattern: /\b(passionate|love|excited|thrill)\b/i, style: 'Enthusiastic and high-energy' },
  { pattern: /\b(rigorous|systematic|structured|method)\b/i, style: 'Structured and methodical' },
  { pattern: /\b(collaborative|together|partnership|team)\b/i, style: 'Collaborative and inclusive' },
  { pattern: /\b(challenge|push|ambitious|bold|disrupt)\b/i, style: 'Direct and challenging' },
  { pattern: /\b(mentor|guide|coach|develop|grow)\b/i, style: 'Supportive and developmental' },
]

/**
 * Extract values and priorities from an interviewer's LinkedIn bio or profile text.
 *
 * This is the "unfair advantage" — understanding the interviewer's likely
 * priorities, communication style, and question themes BEFORE the interview.
 *
 * Uses keyword frequency analysis across 8 value dimensions.
 */
export function extractInterviewerValues(linkedInText: string): InterviewerValues {
  if (!linkedInText || linkedInText.trim().length === 0) {
    return {
      inferredPriorities: [],
      communicationStyle: 'Unknown',
      likelyQuestionThemes: [],
      culturalSignals: [],
      rawText: '',
    }
  }

  const lower = linkedInText.toLowerCase()

  // 1. Score each value dimension by keyword hits
  const scored = Object.entries(VALUES_KEYWORDS).map(([dimension, keywords]) => {
    const hits = keywords.filter(kw => lower.includes(kw)).length
    return { dimension, hits, keywords: keywords.filter(kw => lower.includes(kw)) }
  })
  scored.sort((a, b) => b.hits - a.hits)

  // 2. Top priorities (dimensions with hits > 0, max 4)
  const inferredPriorities = scored
    .filter(s => s.hits > 0)
    .slice(0, 4)
    .map(s => s.dimension.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))

  // 3. Detect communication style
  let communicationStyle = 'Balanced and professional'
  for (const { pattern, style } of COMMUNICATION_STYLES) {
    if (pattern.test(linkedInText)) {
      communicationStyle = style
      break
    }
  }

  // 4. Derive likely question themes from top 3 dimensions
  const questionThemeMap: Record<string, string[]> = {
    'data-driven': ['How do you measure success?', 'What metrics drive your decisions?', 'Describe an A/B test you ran'],
    'people-first': ['How do you develop team members?', 'Describe a culture challenge', 'How do you handle conflict?'],
    'execution': ['Walk me through a complex delivery', 'How do you handle missed deadlines?', 'Describe your sprint process'],
    'innovation': ['Tell me about something you built from scratch', 'How do you validate new ideas?', 'Describe a pivot you drove'],
    'growth': ['What growth levers have you pulled?', 'How do you think about acquisition vs retention?', 'Describe a revenue win'],
    'technical': ['Walk me through a system you designed', 'How do you make technical trade-offs?', 'Describe a scaling challenge'],
    'strategic': ['How do you set product vision?', 'Describe a strategic bet you made', 'How do you align stakeholders?'],
    'customer': ['How do you incorporate user feedback?', 'Describe your research process', 'Tell me about a user insight'],
  }

  const likelyQuestionThemes = scored
    .filter(s => s.hits > 0)
    .slice(0, 3)
    .flatMap(s => (questionThemeMap[s.dimension] || []).slice(0, 2))

  // 5. Cultural signals (what they value in their teams)
  const culturalSignals: string[] = []
  if (/divers|inclusi/.test(lower)) culturalSignals.push('Values diversity & inclusion')
  if (lower.includes('remote') || lower.includes('flexible')) culturalSignals.push('Flexible work advocate')
  if (lower.includes('fast-paced') || lower.includes('startup')) culturalSignals.push('Thrives in fast-paced environments')
  if (lower.includes('enterprise') || lower.includes('scale')) culturalSignals.push('Enterprise/scale experience')
  if (lower.includes('open source') || lower.includes('community')) culturalSignals.push('Community-minded')
  if (culturalSignals.length === 0) culturalSignals.push('Professional and balanced')

  return {
    inferredPriorities,
    communicationStyle,
    likelyQuestionThemes,
    culturalSignals,
    rawText: linkedInText.trim(),
  }
}

/**
 * Prepare the full interview session from the wizard config.
 *
 * This is the "Thinking Engine" — it takes the wizard inputs and produces
 * a prepared session with narrative anchors, prioritized question themes,
 * gap-hunting targets, and scoring mode.
 *
 * When LinkedIn/Emphases are provided, the AI must prioritize these in
 * its question generation and final feedback.
 */
export function prepareInterviewSession(
  config: StrategicWizardConfig,
  narrativeProfile: NarrativeProfile | null,
  cvBullets: string[],
  jobDescription: string
): PreparedInterviewSession {
  // 1. Derive narrative anchors from profile (the North Star)
  const narrativeAnchors: string[] = []
  if (narrativeProfile) {
    narrativeAnchors.push(`Target: ${narrativeProfile.targetRole} (${narrativeProfile.seniorityLevel})`)
    narrativeAnchors.push(`Strength: ${narrativeProfile.coreStrength.replace(/-/g, ' ')}`)
    if (narrativeProfile.desiredBrand) {
      narrativeAnchors.push(`Brand: ${narrativeProfile.desiredBrand}`)
    }
    if (narrativeProfile.painPoint) {
      narrativeAnchors.push(`Gap to close: ${narrativeProfile.painPoint}`)
    }
  }

  // 2. Build prioritized question themes
  const prioritizedQuestionThemes: string[] = []

  // User emphases take top priority
  if (config.userEmphases.trim().length > 0) {
    const emphParts = config.userEmphases.split(/[,;.\n]+/).map(e => e.trim()).filter(Boolean)
    prioritizedQuestionThemes.push(...emphParts.slice(0, 5))
  }

  // Extracted interviewer values come next
  if (config.extractedValues && config.extractedValues.likelyQuestionThemes.length > 0) {
    prioritizedQuestionThemes.push(...config.extractedValues.likelyQuestionThemes.slice(0, 4))
  }

  // Fill with type-appropriate themes
  const typeThemes: Record<string, string[]> = {
    'hr_screening': ['Culture fit', 'Motivation', 'Salary expectations'],
    'hiring_manager': ['Day-to-day execution', 'Team dynamics', 'Decision-making style'],
    'technical': ['System design', 'Problem-solving approach', 'Technical trade-offs'],
    'executive': ['Strategic vision', 'Business impact', 'Leadership philosophy'],
    'peer': ['Collaboration style', 'Conflict resolution', 'Knowledge sharing'],
  }
  const fallbackThemes = typeThemes[config.interviewType] || []
  for (const ft of fallbackThemes) {
    if (!prioritizedQuestionThemes.includes(ft)) {
      prioritizedQuestionThemes.push(ft)
    }
  }

  // 3. Identify gap-hunting targets (where the narrative is weakest)
  const gapHuntingTargets: string[] = []
  if (narrativeProfile && cvBullets.length > 0) {
    const gapAnalysis = analyzeNarrativeGap(cvBullets, narrativeProfile)
    // Missing keywords are gaps the interviewer will probe
    gapHuntingTargets.push(...gapAnalysis.missingKeywords.slice(0, 5))

    // Low-scoring dimensions are also gap targets
    gapAnalysis.evidence
      .filter(ev => ev.maxContribution > 0 && (ev.contribution / ev.maxContribution) < 0.3)
      .forEach(ev => gapHuntingTargets.push(`Weak: ${ev.dimension}`))
  }

  // 4. Determine scoring mode
  const scoringMode = config.answerFormat === 'voice' ? 'content_and_delivery' as const : 'content_only' as const

  // 5. Build session brief
  const briefParts: string[] = []
  briefParts.push(`${config.difficultyLevel.charAt(0).toUpperCase() + config.difficultyLevel.slice(1)}-level ${config.interviewType.replace(/_/g, ' ')} interview`)

  if (config.interviewMode === 'conversational') {
    briefParts.push('in conversational mode with avatar')
  } else {
    briefParts.push(`in traditional mode (${config.answerFormat} responses)`)
  }

  if (config.extractedValues && config.extractedValues.inferredPriorities.length > 0) {
    briefParts.push(`Interviewer values: ${config.extractedValues.inferredPriorities.join(', ')}`)
  }

  if (narrativeProfile) {
    briefParts.push(`Narrative anchor: ${narrativeProfile.coreStrength.replace(/-/g, ' ')}`)
  }

  // Personality influence on brief
  const p = config.personality
  if (p.intensity > 70) briefParts.push('High-pressure interview style')
  else if (p.warmth > 70) briefParts.push('Supportive and encouraging tone')
  if (p.technicalDepth > 70) briefParts.push('Expect deep technical probes')

  return {
    config,
    narrativeAnchors,
    prioritizedQuestionThemes,
    gapHuntingTargets,
    scoringMode,
    sessionBrief: briefParts.join('. ') + '.',
  }
}

/**
 * Calculate a personality-adjusted difficulty multiplier.
 *
 * Higher intensity + directness + pace → harder effective difficulty.
 * Higher warmth → slightly easier effective difficulty.
 *
 * Returns a multiplier from 0.7 (gentle) to 1.5 (intense).
 */
export function calculatePersonalityDifficulty(personality: InterviewerPersonality): number {
  const aggression = (personality.intensity + personality.directness + personality.paceSpeed) / 3
  const softening = personality.warmth / 2
  const raw = (aggression - softening) / 100
  // Map to 0.7-1.5 range
  return Math.max(0.7, Math.min(1.5, 1.0 + raw * 0.8))
}

// ==========================================
// Interview Arena — Hunter Logic Engine
// ==========================================

import type {
  HunterAnalysis,
  HunterAction,
  HunterFollowUp,
  CharacterGuardrails,
  DeliveryMetrics,
  VoiceMetadata,
  ArenaQuestion,
} from '@/types/interview'

import {
  FILLER_WORDS,
  HEDGING_PHRASES,
  POWER_WORDS,
  SENIORITY_SIGNALS,
  PERSONA_GUARDRAILS,
} from '@/types/interview'

/**
 * Extract voice metadata from raw text for delivery analysis.
 * Detects filler words, hedging phrases, power words, and quantified results.
 */
export function extractVoiceMetadata(rawText: string): VoiceMetadata {
  const lower = rawText.toLowerCase()
  const words = rawText.split(/\s+/).filter(Boolean)
  const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 0)

  const foundFillers = FILLER_WORDS.filter(f => lower.includes(f))
  const foundHedging = HEDGING_PHRASES.filter(h => lower.includes(h))
  const foundPower = POWER_WORDS.filter(p => lower.includes(p))

  // Detect quantified results (numbers with context)
  const quantifiedMatches = rawText.match(/\d+[%xX]|\$[\d,.]+|\d+\s*(?:million|billion|thousand|percent|users|customers|teams?|people|projects?|years?|months?)/gi) || []

  return {
    rawText,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    fillerWords: foundFillers,
    hedgingPhrases: foundHedging,
    powerWords: foundPower,
    quantifiedResults: quantifiedMatches,
  }
}

/**
 * Compute delivery metrics from a text response.
 * For text mode, estimates based on reading speed.
 * For voice mode, uses actual duration if provided.
 */
export function computeDeliveryMetrics(
  rawText: string,
  durationSeconds?: number
): DeliveryMetrics {
  const metadata = extractVoiceMetadata(rawText)
  const wordCount = metadata.wordCount

  // Estimate duration if not provided (average typing speed ~40 WPM, speaking ~130 WPM)
  const estimatedDuration = durationSeconds || Math.max(5, Math.round(wordCount / 2.2))
  const wpm = estimatedDuration > 0 ? Math.round((wordCount / estimatedDuration) * 60) : 0

  // Confidence scoring: start at 80, subtract for fillers/hedging, add for power words
  let confidence = 80
  confidence -= metadata.fillerWords.length * 5
  confidence -= metadata.hedgingPhrases.length * 8
  confidence += metadata.powerWords.length * 4
  confidence += metadata.quantifiedResults.length * 3
  confidence = Math.max(0, Math.min(100, confidence))

  // Tone detection
  let detectedTone: DeliveryMetrics['detectedTone'] = 'analytical'
  if (metadata.powerWords.length >= 3 && metadata.hedgingPhrases.length === 0) {
    detectedTone = 'assertive'
  } else if (metadata.hedgingPhrases.length >= 2) {
    detectedTone = 'tentative'
  } else if (metadata.quantifiedResults.length >= 2) {
    detectedTone = 'analytical'
  } else if (wordCount > 100 && metadata.sentenceCount >= 4) {
    detectedTone = 'storytelling'
  }

  return {
    wordsPerMinute: wpm,
    confidenceScore: confidence,
    detectedTone,
    durationSeconds: estimatedDuration,
    fillerWordCount: metadata.fillerWords.length,
  }
}

/**
 * Detect the seniority level expressed in a response based on keyword signals.
 */
export function detectResponseSeniority(text: string): SeniorityLevel | 'unknown' {
  const lower = text.toLowerCase()

  const scores: Record<string, number> = {}
  for (const [level, keywords] of Object.entries(SENIORITY_SIGNALS)) {
    scores[level] = keywords.filter(k => lower.includes(k)).length
  }

  const maxLevel = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  if (!maxLevel || maxLevel[1] === 0) return 'unknown'

  // Map to SeniorityLevel type
  const levelMap: Record<string, SeniorityLevel> = {
    'entry-level': 'entry-level',
    'mid-level': 'mid-level',
    'senior': 'senior',
    'executive': 'executive',
  }
  return levelMap[maxLevel[0]] || 'unknown'
}

/**
 * Hunter Logic: Analyze a candidate's response in real-time.
 *
 * Cross-references the response against:
 * 1. Job description keywords (from gap-hunting targets)
 * 2. Narrative anchors (core strengths the candidate should demonstrate)
 * 3. Required seniority level
 *
 * Returns an analysis with matched/missing keywords, gap detection,
 * and the recommended follow-up action.
 */
export function analyzeResponseWithHunterLogic(
  responseText: string,
  targetKeywords: string[],
  narrativeAnchors: string[],
  requiredSeniority: SeniorityLevel,
  currentDrillDownCount: number,
  maxDrillDowns: number
): HunterAnalysis {
  const lower = responseText.toLowerCase()

  // 1. Keyword matching — check target keywords + narrative anchor words
  const allExpected = [...new Set([...targetKeywords, ...narrativeAnchors.flatMap(a => a.toLowerCase().split(/\s+/))])]
  const matchedKeywords = allExpected.filter(k => lower.includes(k.toLowerCase()))
  const missingKeywords = allExpected.filter(k => !lower.includes(k.toLowerCase()))

  // 2. Seniority detection
  const detectedSeniority = detectResponseSeniority(responseText)

  // 3. Gap detection
  const keywordCoverage = allExpected.length > 0 ? matchedKeywords.length / allExpected.length : 1
  const seniorityGap = detectSeniorityGap(detectedSeniority, requiredSeniority)

  const gapDetected = keywordCoverage < 0.3 || seniorityGap
  let gapDescription = ''
  if (seniorityGap) {
    gapDescription = `Response sounds like ${detectedSeniority || 'unknown'} level but role requires ${requiredSeniority}`
  } else if (keywordCoverage < 0.3) {
    gapDescription = `Only ${Math.round(keywordCoverage * 100)}% keyword coverage. Missing: ${missingKeywords.slice(0, 3).join(', ')}`
  }

  // 4. Determine action
  let action: HunterAction = 'pivot'
  let actionReason = ''

  if (gapDetected && currentDrillDownCount < maxDrillDowns) {
    if (seniorityGap) {
      action = 'challenge'
      actionReason = `Seniority mismatch: candidate expressing ${detectedSeniority} level, need ${requiredSeniority}`
    } else {
      action = 'drill_down'
      actionReason = `Low keyword coverage (${Math.round(keywordCoverage * 100)}%). Drilling deeper for specifics.`
    }
  } else if (gapDetected && currentDrillDownCount >= maxDrillDowns) {
    action = 'pivot'
    actionReason = `Max drill-downs (${maxDrillDowns}) reached. Pivoting to next topic.`
  } else {
    action = 'acknowledge'
    actionReason = `Good response. ${Math.round(keywordCoverage * 100)}% keyword coverage with appropriate seniority.`
  }

  // 5. Score the response
  const keywordScore = Math.round(keywordCoverage * 40) // 40 points max for keywords
  const seniorityScore = seniorityGap ? 0 : 30 // 30 points for matching seniority
  const depthScore = Math.min(30, responseText.split(/[.!?]+/).filter(Boolean).length * 5) // 30 points max for depth
  const responseScore = Math.min(100, keywordScore + seniorityScore + depthScore)

  return {
    matchedKeywords,
    missingKeywords,
    detectedSeniority,
    requiredSeniority,
    gapDetected,
    gapDescription,
    action,
    actionReason,
    responseScore,
  }
}

/**
 * Detect if there's a seniority gap between response and requirement.
 */
function detectSeniorityGap(detected: SeniorityLevel | 'unknown', required: SeniorityLevel): boolean {
  if (detected === 'unknown') return false // Don't penalize if we can't detect
  const levels: (SeniorityLevel | 'unknown')[] = ['entry-level', 'mid-level', 'senior', 'executive']
  const detectedIdx = levels.indexOf(detected)
  const requiredIdx = levels.indexOf(required)
  // Gap if detected is 2+ levels below required
  return requiredIdx - detectedIdx >= 2
}

/**
 * Generate a follow-up question based on Hunter Logic analysis.
 *
 * Uses the analysis results to craft contextually appropriate follow-ups
 * that stay in character with the interviewer persona.
 */
export function generateHunterFollowUp(
  analysis: HunterAnalysis,
  originalQuestion: string,
  guardrails: CharacterGuardrails
): HunterFollowUp {
  const prefix = guardrails.questionPrefixes[
    Math.floor(Math.random() * guardrails.questionPrefixes.length)
  ] || ''

  switch (analysis.action) {
    case 'drill_down': {
      const missingContext = analysis.missingKeywords.slice(0, 2).join(' and ')
      return {
        question: `${prefix} how specifically did you handle ${missingContext}? I'd like concrete examples.`,
        action: 'drill_down',
        reason: analysis.actionReason,
        targetGap: missingContext,
      }
    }
    case 'challenge': {
      const requiredLevel = analysis.requiredSeniority.replace(/-/g, ' ')
      return {
        question: `${prefix} as a ${requiredLevel} professional, how did you drive strategic decisions rather than just execute them? What was your unique leadership contribution?`,
        action: 'challenge',
        reason: analysis.actionReason,
        targetGap: `Seniority: ${analysis.detectedSeniority} vs ${analysis.requiredSeniority}`,
      }
    }
    case 'acknowledge': {
      const empathy = guardrails.showEmpathy ? 'That\'s a strong example. ' : ''
      return {
        question: `${empathy}Let's move on to the next area.`,
        action: 'acknowledge',
        reason: analysis.actionReason,
        targetGap: '',
      }
    }
    case 'pivot':
    default: {
      return {
        question: `${prefix} let's shift gears. I'd like to explore a different area.`,
        action: 'pivot',
        reason: analysis.actionReason,
        targetGap: 'Max follow-ups reached',
      }
    }
  }
}

/**
 * Build character guardrails from persona and personality configuration.
 */
export function buildCharacterGuardrails(
  personality: InterviewerPersonality,
  persona?: string
): CharacterGuardrails {
  // Start with persona-based defaults
  const presetKey = persona || 'friendly'
  const preset = PERSONA_GUARDRAILS[presetKey] || PERSONA_GUARDRAILS.friendly

  // Adjust challenge intensity based on personality
  const challengeIntensity = Math.round(
    (personality.intensity * 0.4 + personality.directness * 0.4 + (100 - personality.warmth) * 0.2)
  )

  // Adjust max drill-downs based on intensity
  const intensityAdjustment = personality.intensity > 70 ? 1 : personality.intensity < 30 ? -1 : 0
  const maxDrillDowns = Math.max(1, preset.maxDrillDowns + intensityAdjustment)

  return {
    ...preset,
    maxDrillDowns,
    challengeIntensity: Math.max(0, Math.min(100, challengeIntensity)),
  }
}

/**
 * Generate the initial set of arena questions from a prepared session.
 * Maps session themes into structured questions with target keywords.
 */
export function generateArenaQuestions(
  session: PreparedInterviewSession,
  questionCount: number = 8
): ArenaQuestion[] {
  const questions: ArenaQuestion[] = []
  const themes = session.prioritizedQuestionThemes
  const gaps = session.gapHuntingTargets
  const difficulty = session.config.difficultyLevel

  // Map difficulty to required seniority
  const seniorityMap: Record<string, SeniorityLevel> = {
    entry: 'entry-level',
    standard: 'mid-level',
    senior: 'senior',
    executive: 'executive',
  }
  const requiredSeniority = seniorityMap[difficulty] || 'mid-level'

  // Category distribution: opening(1), technical, behavioral, situational, closing(1)
  // Reserve first and last slots for opening/closing, fill middle to fit exactly
  const middleSlots = Math.max(1, questionCount - 2)
  const techCount = Math.max(1, Math.round(middleSlots * 0.4))
  const behavioralCount = Math.max(1, Math.round(middleSlots * 0.35))
  const situationalCount = Math.max(0, middleSlots - techCount - behavioralCount)
  const categories: ArenaQuestion['category'][] = [
    'opening',
    ...Array(techCount).fill('technical') as ArenaQuestion['category'][],
    ...Array(behavioralCount).fill('behavioral') as ArenaQuestion['category'][],
    ...(situationalCount > 0 ? Array(situationalCount).fill('situational') as ArenaQuestion['category'][] : []),
    'closing',
  ]

  const actualCount = Math.min(questionCount, categories.length)

  for (let i = 0; i < actualCount; i++) {
    const category = categories[i]
    const theme = themes[i % themes.length] || 'general experience'
    const gapTarget = gaps[i % Math.max(1, gaps.length)] || ''

    // Combine theme keywords with gap keywords
    const targetKeywords = [
      ...theme.toLowerCase().split(/\s+/).filter(w => w.length > 3),
      ...gapTarget.toLowerCase().split(/\s+/).filter(w => w.length > 3),
    ].slice(0, 6)

    const questionDifficulty: ArenaQuestion['difficulty'] =
      category === 'opening' || category === 'closing' ? 'easy' :
      difficulty === 'executive' || difficulty === 'senior' ? 'hard' : 'medium'

    questions.push({
      id: `arena-q-${i + 1}`,
      question: generateQuestionText(category, theme, difficulty, gapTarget),
      category,
      targetKeywords,
      expectedSeniority: requiredSeniority,
      difficulty: questionDifficulty,
      maxFollowUps: category === 'opening' || category === 'closing' ? 1 : 3,
    })
  }

  return questions
}

/**
 * Generate a contextual question text based on category and theme.
 */
function generateQuestionText(
  category: ArenaQuestion['category'],
  theme: string,
  difficulty: string,
  gapTarget: string
): string {
  const themeClean = theme.replace(/-/g, ' ')

  switch (category) {
    case 'opening':
      return `Tell me about your background and what draws you to this role, particularly your experience with ${themeClean}.`
    case 'technical':
      if (difficulty === 'executive' || difficulty === 'senior') {
        return `Describe a time you made a strategic technical decision around ${themeClean}. What were the trade-offs and how did you drive alignment?`
      }
      return `Walk me through your approach to ${themeClean}. Can you give a specific example from your recent work?`
    case 'behavioral':
      if (gapTarget) {
        return `I noticed your background emphasizes certain areas. Tell me about a time you demonstrated ${themeClean}, especially regarding ${gapTarget.replace(/-/g, ' ')}.`
      }
      return `Give me a specific example of when you demonstrated ${themeClean}. What was the situation and what was the outcome?`
    case 'situational':
      return `Imagine you're facing a challenge with ${themeClean}. Walk me through how you'd approach it and what stakeholders you'd involve.`
    case 'closing':
      return `Based on our conversation, is there anything about your experience with ${themeClean} that you'd like to highlight that we haven't covered?`
    default:
      return `Tell me about your experience with ${themeClean}.`
  }
}

// ==========================================
// Strategic Onboarding — Narrative Verification
// ==========================================

/** Result of comparing CV's current message against user's ambition */
export interface NarrativeVerificationResult {
  /** Current detected archetype from CV */
  currentArchetype: string
  /** Target archetype derived from ambition */
  targetArchetype: string
  /** Current narrative summary (what the CV says about you) */
  currentMessage: string
  /** Target narrative summary (what you want recruiters to see) */
  targetMessage: string
  /** Overall alignment score 0-100 */
  alignmentScore: number
  /** Per-dimension comparison */
  dimensions: NarrativeVerificationDimension[]
  /** Key gaps identified */
  gaps: string[]
  /** Strengths already aligned */
  strengths: string[]
  /** Personalized recommendation */
  recommendation: string
}

export interface NarrativeVerificationDimension {
  name: string
  currentScore: number
  targetScore: number
  status: 'aligned' | 'partial' | 'gap'
}

/**
 * Verify the narrative alignment between a user's CV and their stated ambition.
 * This is the "Aha!" moment of onboarding — showing users the gap between
 * their current professional message and where they want to be.
 */
export function verifyNarrativeAlignment(
  cvBullets: string[],
  ambition: { targetRole: string; experienceLevel: string; desiredBrand: string }
): NarrativeVerificationResult {
  // Map experience level to seniority
  const seniorityMap: Record<string, SeniorityLevel> = {
    entry_level: 'entry-level',
    mid_level: 'mid-level',
    senior: 'senior',
    executive: 'executive',
    career_change: 'mid-level',
  }
  const seniority = seniorityMap[ambition.experienceLevel] || 'mid-level'

  // Build a narrative profile from the ambition
  const profile: NarrativeProfile = {
    targetRole: ambition.targetRole,
    seniorityLevel: seniority,
    coreStrength: inferCoreStrength(ambition.desiredBrand),
    desiredBrand: ambition.desiredBrand,
  }

  // Run the narrative gap analysis
  const analysis = analyzeNarrativeGap(cvBullets, profile)

  // Determine target archetype from core strength (resolve display name)
  const targetArchetypeId = STRENGTH_TO_ARCHETYPE[profile.coreStrength] || 'strategic-leader'
  const targetArchetypeProfile = ARCHETYPE_PROFILES.find(a => a.id === targetArchetypeId)
  const targetArchetype = targetArchetypeProfile?.name || profile.coreStrength.replace(/-/g, ' ')

  // Build current message from detected archetype + evidence
  const currentMessage = buildCurrentMessage(analysis.detectedArchetype, analysis.evidence, cvBullets)
  const targetMessage = buildTargetMessage(targetArchetype, ambition.targetRole, ambition.desiredBrand, seniority)

  // Map evidence to verification dimensions
  const dimensions: NarrativeVerificationDimension[] = analysis.evidence.map(ev => {
    const currentPct = ev.maxContribution > 0 ? Math.round((ev.contribution / ev.maxContribution) * 100) : 0
    const targetPct = 80 // Target is always 80%+ alignment
    return {
      name: ev.dimension,
      currentScore: currentPct,
      targetScore: targetPct,
      status: currentPct >= 70 ? 'aligned' as const : currentPct >= 40 ? 'partial' as const : 'gap' as const,
    }
  })

  // Identify gaps and strengths
  const gaps = analysis.missingKeywords.slice(0, 5).map(k =>
    `Missing "${k}" — important for ${ambition.targetRole} positioning`
  )
  const strengths = analysis.alignedKeywords.slice(0, 5).map(k =>
    `Strong "${k}" — aligned with your target brand`
  )

  // Build recommendation
  const recommendation = generateVerificationRecommendation(
    analysis.narrativeMatchPercent, analysis.detectedArchetype, targetArchetype, ambition.targetRole
  )

  return {
    currentArchetype: analysis.detectedArchetype,
    targetArchetype,
    currentMessage,
    targetMessage,
    alignmentScore: analysis.narrativeMatchPercent,
    dimensions,
    gaps,
    strengths,
    recommendation,
  }
}

/** Infer core strength from a desired brand statement */
function inferCoreStrength(desiredBrand: string): CoreStrength {
  const lower = desiredBrand.toLowerCase()
  if (/strateg|leader|vision|transform|scale/.test(lower)) return 'strategic-leadership'
  if (/techni|architect|engineer|system|build/.test(lower)) return 'technical-mastery'
  if (/operat|process|efficien|deliver|execut/.test(lower)) return 'operational-excellence'
  if (/innovat|growth|disrupt|market|business/.test(lower)) return 'business-innovation'
  return 'strategic-leadership' // default
}

/** Build a human-readable summary of the current CV message */
function buildCurrentMessage(archetype: string, evidence: NarrativeEvidence[], cvBullets: string[]): string {
  if (cvBullets.length === 0) return 'No CV content detected. Upload your CV to see your current professional message.'

  const strongDims = evidence.filter(e => e.contribution > e.maxContribution * 0.5)
  const weakDims = evidence.filter(e => e.contribution < e.maxContribution * 0.3)

  let msg = `Your CV currently projects a "${archetype}" profile.`
  if (strongDims.length > 0) {
    msg += ` Strong in ${strongDims.map(d => d.dimension).join(', ')}.`
  }
  if (weakDims.length > 0) {
    msg += ` Needs improvement in ${weakDims.map(d => d.dimension).join(', ')}.`
  }
  return msg
}

/** Build a human-readable summary of the target message */
function buildTargetMessage(archetype: string, targetRole: string, brand: string, seniority: SeniorityLevel): string {
  return `For "${targetRole}" at ${seniority} level, you need a "${archetype}" profile that communicates: "${brand}".`
}

/** Generate a personalized recommendation based on alignment */
function generateVerificationRecommendation(
  matchPercent: number, currentArch: string, targetArch: string, targetRole: string
): string {
  if (matchPercent >= 80) {
    return `Excellent alignment! Your CV already communicates the right message for ${targetRole}. Fine-tuning will make it perfect.`
  }
  if (matchPercent >= 50) {
    return `Good foundation. Your "${currentArch}" profile is close to the "${targetArch}" brand needed for ${targetRole}. Our AI tailoring will bridge the remaining gaps.`
  }
  if (matchPercent >= 25) {
    return `Significant opportunity. Your CV currently reads as "${currentArch}" but ${targetRole} requires "${targetArch}" positioning. Our narrative engine will transform your message.`
  }
  return `Major transformation needed. Your "${currentArch}" profile doesn't align with ${targetRole} expectations for a "${targetArch}". This is exactly what Signatura was built for — let's reshape your narrative.`
}

export {
  generateSiggyPMContext,
  analyzeWithPMPrinciples,
  PM_CORE_PRINCIPLES,
  getPrinciplesForContext,
}

export { STAGE_WEIGHTS, PM_SPECIALIST_WEIGHTS, GENERAL_PROFESSIONAL_WEIGHTS }
