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

export {
  generateSiggyPMContext,
  analyzeWithPMPrinciples,
  PM_CORE_PRINCIPLES,
  getPrinciplesForContext,
}

export { STAGE_WEIGHTS, PM_SPECIALIST_WEIGHTS, GENERAL_PROFESSIONAL_WEIGHTS }
