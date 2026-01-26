/**
 * CV Tailoring Engine - Best of Both Worlds
 *
 * Core principle: The tailored CV must NEVER be worse than the original.
 *
 * "Apples-to-Apples" Scoring Philosophy:
 * - A CV's score is a WEIGHTED AVERAGE of:
 *   - Core Content (70%): The 10-Indicator semantic quality
 *   - Landing Page (30%): Visual hygiene, ATS compatibility, formatting
 *
 * Non-Regression Logic:
 * - For each indicator, final score = MAX(base, tailored)
 * - The tailoring can only improve, never regress
 */

import OpenAI from 'openai'
import { scoreText } from '@/lib/indicators/scorer'
import { IndicatorScores, INDICATOR_NAMES, ScoringContext } from '@/lib/indicators/types'
import {
  parseCVIntoSections,
  assembleCVFromSections,
  sectionsMatch,
} from './parser'
import { scoreLandingPage, LandingPageMetrics } from './landing-page-scorer'

// Lazy-initialize OpenAI client
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'

// Scoring weights for the Apples-to-Apples comparison
const CORE_WEIGHT = 0.70
const LANDING_PAGE_WEIGHT = 0.30

/**
 * Comprehensive score structure for Apples-to-Apples comparison
 */
export interface CVScore {
  overall_score: number       // Weighted: (coreScore * 0.7) + (landingPageScore * 0.3)
  core_score: number          // Average of 10 indicators
  landing_page_score: number  // Formatting/ATS score
  indicator_scores: IndicatorScoreEntry[]
  landing_page_metrics?: LandingPageMetrics
}

export interface IndicatorScoreEntry {
  indicator_number: number
  indicator_name: string
  score: number
  evidence?: string
  suggestion?: string
}

/**
 * Section score with full details
 */
export interface SectionScore {
  text: string
  score: number
  indicatorScores?: IndicatorScores
}

/**
 * Comparison result for a single section
 */
export interface SectionComparison {
  sectionName: string
  base: SectionScore
  tailored: SectionScore
  chosen: 'base' | 'tailored'
  improvement: number
  reason: string
}

/**
 * Full tailoring result with new score structure
 */
export interface TailoringResult {
  success: boolean
  error?: string
  finalCVText: string
  sectionComparisons: SectionComparison[]
  // Legacy scores (for backward compatibility)
  baseOverallScore: number
  tailoredOverallScore: number
  finalOverallScore: number
  overallImprovement: number
  // New comprehensive scores (Apples-to-Apples)
  initial_scores: CVScore
  final_scores: CVScore
  // Statistics
  sectionsImproved: number
  sectionsKeptOriginal: number
  totalSections: number
  processingTimeMs: number
  tokensUsed?: number
}

/**
 * Initial analysis result (before tailoring)
 */
export interface InitialAnalysisResult {
  success: boolean
  error?: string
  scores: CVScore
  processingTimeMs: number
}

/**
 * Calculate weighted overall score
 */
function calculateWeightedScore(coreScore: number, landingPageScore: number): number {
  return Math.round((coreScore * CORE_WEIGHT + landingPageScore * LANDING_PAGE_WEIGHT) * 10) / 10
}

/**
 * Convert IndicatorScores to IndicatorScoreEntry array
 */
function convertToIndicatorEntries(scores: IndicatorScores | null): IndicatorScoreEntry[] {
  if (!scores) return []

  return Object.entries(scores.scores).map(([numStr, score]) => ({
    indicator_number: parseInt(numStr),
    indicator_name: INDICATOR_NAMES[parseInt(numStr)] || `Indicator ${numStr}`,
    score: score.score,
    evidence: score.evidence,
    suggestion: score.suggestion,
  }))
}

/**
 * Calculate average from indicator entries
 */
function calculateCoreAverage(entries: IndicatorScoreEntry[]): number {
  if (entries.length === 0) return 5
  const sum = entries.reduce((acc, e) => acc + e.score, 0)
  return Math.round((sum / entries.length) * 10) / 10
}

/**
 * Perform initial analysis on a CV (Base/Original)
 * This scores both Core Content (70%) and Landing Page (30%)
 */
export async function analyzeInitialCV(
  cvText: string,
  industry: string = 'generic',
  isHtml: boolean = false
): Promise<InitialAnalysisResult> {
  const startTime = Date.now()

  try {
    if (!cvText || cvText.trim().length < 100) {
      return {
        success: false,
        error: 'CV text is too short (minimum 100 characters)',
        scores: createEmptyScore(),
        processingTimeMs: Date.now() - startTime,
      }
    }

    // Score Core Content (10 Indicators)
    const context: ScoringContext = { type: 'cv', industry }
    const coreResult = await scoreText(cvText, context)

    const indicatorEntries = convertToIndicatorEntries(coreResult.scores || null)
    const coreScore = coreResult.success
      ? coreResult.scores?.overall || calculateCoreAverage(indicatorEntries)
      : 5

    // Score Landing Page (Formatting/ATS)
    const landingPageMetrics = scoreLandingPage(cvText, isHtml)
    const landingPageScore = landingPageMetrics.overall

    // Calculate weighted overall score
    const overallScore = calculateWeightedScore(coreScore, landingPageScore)

    console.log(`Initial Analysis: Core=${coreScore}, LandingPage=${landingPageScore}, Overall=${overallScore}`)

    return {
      success: true,
      scores: {
        overall_score: overallScore,
        core_score: coreScore,
        landing_page_score: landingPageScore,
        indicator_scores: indicatorEntries,
        landing_page_metrics: landingPageMetrics,
      },
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Initial analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      scores: createEmptyScore(),
      processingTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Create empty score structure
 */
function createEmptyScore(): CVScore {
  return {
    overall_score: 0,
    core_score: 0,
    landing_page_score: 0,
    indicator_scores: [],
  }
}

/**
 * Apply "Best of Both Worlds" non-regression logic
 * For each indicator: final = MAX(base, tailored)
 */
function applyNonRegressionLogic(
  baseEntries: IndicatorScoreEntry[],
  tailoredEntries: IndicatorScoreEntry[]
): IndicatorScoreEntry[] {
  const result: IndicatorScoreEntry[] = []

  // Create map for quick lookup
  const tailoredMap = new Map<number, IndicatorScoreEntry>()
  tailoredEntries.forEach(e => tailoredMap.set(e.indicator_number, e))

  // For each base indicator, take the max score
  for (const baseEntry of baseEntries) {
    const tailoredEntry = tailoredMap.get(baseEntry.indicator_number)

    if (tailoredEntry && tailoredEntry.score > baseEntry.score) {
      // Tailored is better - use it
      result.push({
        ...tailoredEntry,
        evidence: tailoredEntry.evidence || baseEntry.evidence,
        suggestion: tailoredEntry.suggestion || baseEntry.suggestion,
      })
    } else {
      // Base is same or better - keep it
      result.push(baseEntry)
    }
  }

  // Add any new indicators from tailored that weren't in base
  for (const tailoredEntry of tailoredEntries) {
    if (!baseEntries.some(b => b.indicator_number === tailoredEntry.indicator_number)) {
      result.push(tailoredEntry)
    }
  }

  return result.sort((a, b) => a.indicator_number - b.indicator_number)
}

/**
 * Generate a "Best of Both Worlds" tailored CV
 *
 * Process:
 * 1. Run initial analysis on base CV (Core + Landing Page)
 * 2. Generate AI-tailored CV
 * 3. Score tailored CV (Core + Landing Page)
 * 4. Apply non-regression: For each indicator, final = MAX(base, tailored)
 * 5. Calculate final weighted score
 */
export async function generateBestOfBothWorldsCV(
  baseCVText: string,
  jobDescription: string,
  industry: string = 'generic'
): Promise<TailoringResult> {
  const startTime = Date.now()
  let totalTokens = 0

  try {
    // Validate inputs
    if (!baseCVText || baseCVText.trim().length < 100) {
      return createErrorResult('Base CV text is too short (minimum 100 characters)', baseCVText, startTime)
    }

    if (!jobDescription || jobDescription.trim().length < 50) {
      return createErrorResult('Job description is too short (minimum 50 characters)', baseCVText, startTime)
    }

    // STEP 1: Initial Analysis of Base CV
    console.log('Step 1: Analyzing base CV (Core + Landing Page)...')
    const initialAnalysis = await analyzeInitialCV(baseCVText, industry, false)

    if (!initialAnalysis.success) {
      return createErrorResult(initialAnalysis.error || 'Initial analysis failed', baseCVText, startTime)
    }

    const initialScores = initialAnalysis.scores
    console.log(`Base CV: Core=${initialScores.core_score}, LandingPage=${initialScores.landing_page_score}, Overall=${initialScores.overall_score}`)

    // STEP 2: Parse base CV into sections
    console.log('Step 2: Parsing base CV into sections...')
    const baseSections = parseCVIntoSections(baseCVText)
    console.log(`Found ${baseSections.length} sections in base CV`)

    // STEP 3: Generate tailored CV
    console.log('Step 3: Generating AI-tailored CV...')
    const { tailoredText, tokensUsed } = await generateTailoredCVWithAI(
      baseCVText,
      jobDescription,
      industry
    )
    totalTokens += tokensUsed || 0

    // STEP 4: Parse tailored CV
    console.log('Step 4: Parsing tailored CV into sections...')
    const tailoredSections = parseCVIntoSections(tailoredText)
    console.log(`Found ${tailoredSections.length} sections in tailored CV`)

    // STEP 5: Score tailored CV (Core indicators)
    console.log('Step 5: Scoring tailored CV (Core indicators)...')
    const context: ScoringContext = {
      type: 'cv',
      industry,
      role: extractRoleFromJobDescription(jobDescription),
    }
    const tailoredCoreResult = await scoreText(tailoredText, context)
    const tailoredIndicatorEntries = convertToIndicatorEntries(tailoredCoreResult.scores || null)
    const tailoredCoreScore = tailoredCoreResult.success
      ? tailoredCoreResult.scores?.overall || calculateCoreAverage(tailoredIndicatorEntries)
      : initialScores.core_score

    // STEP 6: Score tailored CV (Landing Page)
    // For tailored HTML/text, landing page score should be high
    console.log('Step 6: Scoring tailored CV (Landing Page)...')
    const tailoredLandingMetrics = scoreLandingPage(tailoredText, false)
    const tailoredLandingScore = tailoredLandingMetrics.overall

    console.log(`Tailored CV: Core=${tailoredCoreScore}, LandingPage=${tailoredLandingScore}`)

    // STEP 7: Apply non-regression logic (Best of Both Worlds)
    console.log('Step 7: Applying non-regression logic (Best of Both Worlds)...')
    const bestOfBothIndicators = applyNonRegressionLogic(
      initialScores.indicator_scores,
      tailoredIndicatorEntries
    )

    // Calculate best-of-both core score
    const bestOfBothCoreScore = calculateCoreAverage(bestOfBothIndicators)

    // Use the better landing page score (tailored usually wins here)
    const finalLandingScore = Math.max(initialScores.landing_page_score, tailoredLandingScore)

    // Calculate final weighted score
    const finalOverallScore = calculateWeightedScore(bestOfBothCoreScore, finalLandingScore)

    console.log(`Best of Both: Core=${bestOfBothCoreScore}, LandingPage=${finalLandingScore}, Overall=${finalOverallScore}`)

    // STEP 8: Compare sections and choose best versions
    console.log('Step 8: Comparing sections and choosing best versions...')
    const sectionComparisons: SectionComparison[] = []
    const finalSections: Array<{ name: string; text: string }> = []
    let sectionsImproved = 0
    let sectionsKeptOriginal = 0

    for (const baseSection of baseSections) {
      const tailoredSection = tailoredSections.find((ts) =>
        sectionsMatch(ts.name, baseSection.name)
      )

      if (!tailoredSection) {
        // Keep original if tailored doesn't have this section
        finalSections.push({ name: baseSection.name, text: baseSection.text })
        sectionComparisons.push({
          sectionName: baseSection.name,
          base: { text: baseSection.text, score: initialScores.core_score },
          tailored: { text: '', score: 0 },
          chosen: 'base',
          improvement: 0,
          reason: 'Section not found in tailored version - keeping original',
        })
        sectionsKeptOriginal++
        continue
      }

      // Score both sections
      const baseSectionScore = await scoreSectionText(baseSection.text, jobDescription, industry)
      const tailoredSectionScore = await scoreSectionText(tailoredSection.text, jobDescription, industry)

      // Choose the better version (non-regression)
      const useTailored = tailoredSectionScore > baseSectionScore
      const improvement = tailoredSectionScore - baseSectionScore

      finalSections.push({
        name: baseSection.name,
        text: useTailored ? tailoredSection.text : baseSection.text,
      })

      sectionComparisons.push({
        sectionName: baseSection.name,
        base: { text: baseSection.text, score: baseSectionScore },
        tailored: { text: tailoredSection.text, score: tailoredSectionScore },
        chosen: useTailored ? 'tailored' : 'base',
        improvement: useTailored ? improvement : 0,
        reason: useTailored
          ? `Tailored version scored higher (+${improvement.toFixed(1)} points)`
          : baseSectionScore === tailoredSectionScore
            ? 'Scores equal - keeping original for consistency'
            : 'Original version scored higher - keeping it',
      })

      if (useTailored) sectionsImproved++
      else sectionsKeptOriginal++
    }

    // Add new sections from tailored that weren't in base
    for (const tailoredSection of tailoredSections) {
      const hasMatch = baseSections.some((bs) => sectionsMatch(bs.name, tailoredSection.name))

      if (!hasMatch && tailoredSection.text.length > 50) {
        const newSectionScore = await scoreSectionText(tailoredSection.text, jobDescription, industry)

        if (newSectionScore >= 5) {
          finalSections.push({ name: tailoredSection.name, text: tailoredSection.text })
          sectionComparisons.push({
            sectionName: tailoredSection.name,
            base: { text: '', score: 0 },
            tailored: { text: tailoredSection.text, score: newSectionScore },
            chosen: 'tailored',
            improvement: newSectionScore,
            reason: 'New section added that strengthens the CV',
          })
          sectionsImproved++
        }
      }
    }

    // STEP 9: Assemble final CV
    console.log('Step 9: Assembling final CV from best sections...')
    const finalCVText = assembleCVFromSections(finalSections)

    // Build final scores object
    const finalScores: CVScore = {
      overall_score: finalOverallScore,
      core_score: bestOfBothCoreScore,
      landing_page_score: finalLandingScore,
      indicator_scores: bestOfBothIndicators,
      landing_page_metrics: tailoredLandingMetrics,
    }

    // Calculate improvement
    const overallImprovement = finalOverallScore - initialScores.overall_score

    console.log(`Success! Improvement: +${overallImprovement.toFixed(1)} points`)

    return {
      success: true,
      finalCVText,
      sectionComparisons,
      // Legacy scores (backward compatibility)
      baseOverallScore: initialScores.overall_score,
      tailoredOverallScore: calculateWeightedScore(tailoredCoreScore, tailoredLandingScore),
      finalOverallScore,
      overallImprovement,
      // New comprehensive scores
      initial_scores: initialScores,
      final_scores: finalScores,
      // Statistics
      sectionsImproved,
      sectionsKeptOriginal,
      totalSections: sectionComparisons.length,
      processingTimeMs: Date.now() - startTime,
      tokensUsed: totalTokens,
    }
  } catch (error) {
    console.error('CV tailoring error:', error)
    return createErrorResult(
      error instanceof Error ? error.message : 'Unknown error occurred',
      baseCVText,
      startTime
    )
  }
}

/**
 * Create error result with empty scores
 */
function createErrorResult(error: string, baseCVText: string, startTime: number): TailoringResult {
  const emptyScore = createEmptyScore()
  return {
    success: false,
    error,
    finalCVText: baseCVText,
    sectionComparisons: [],
    baseOverallScore: 0,
    tailoredOverallScore: 0,
    finalOverallScore: 0,
    overallImprovement: 0,
    initial_scores: emptyScore,
    final_scores: emptyScore,
    sectionsImproved: 0,
    sectionsKeptOriginal: 0,
    totalSections: 0,
    processingTimeMs: Date.now() - startTime,
  }
}

/**
 * Score a section of CV text
 */
async function scoreSectionText(
  sectionText: string,
  jobDescription: string,
  industry: string
): Promise<number> {
  if (!sectionText || sectionText.length < 20) {
    return 0
  }

  const context: ScoringContext = { type: 'cv', industry }

  // For short sections, use heuristic scoring
  if (sectionText.length < 100) {
    let score = 5

    // Check for quantifiable achievements
    if (sectionText.match(/\d+%|\$\d+|\d+ years?|\d+ (people|team|projects?)/i)) {
      score += 1
    }

    // Check for action verbs
    const actionVerbs = ['led', 'managed', 'developed', 'created', 'implemented', 'increased', 'reduced', 'improved', 'achieved', 'delivered']
    if (actionVerbs.some((v) => sectionText.toLowerCase().includes(v))) {
      score += 0.5
    }

    return Math.min(10, score)
  }

  try {
    const result = await scoreText(sectionText, context)
    return result.success ? result.scores?.overall || 5 : 5
  } catch {
    return 5
  }
}

/**
 * Generate a fully tailored CV using AI
 */
async function generateTailoredCVWithAI(
  baseCVText: string,
  jobDescription: string,
  industry: string
): Promise<{ tailoredText: string; tokensUsed?: number }> {
  const useMock = process.env.USE_MOCK_AI === 'true'

  if (useMock) {
    return {
      tailoredText: enhanceCVForMock(baseCVText),
      tokensUsed: 0,
    }
  }

  const prompt = `You are an expert CV writer specializing in optimizing resumes for specific job descriptions.

CRITICAL INSTRUCTIONS:
1. Tailor the CV to match the job description requirements
2. Maintain ALL factual information - never fabricate achievements or experiences
3. Use relevant keywords from the job description naturally
4. Emphasize achievements that align with job requirements
5. Add quantifiable metrics where already present in the base CV (don't invent numbers)
6. Use strong action verbs appropriate to the ${industry} industry
7. Maintain professional formatting and structure
8. Keep ALL sections from the original CV

INDUSTRY CONTEXT: ${industry}

BASE CV:
${baseCVText}

JOB DESCRIPTION:
${jobDescription}

Generate a tailored CV that:
- Keeps all true information from the base CV
- Optimizes wording to match job requirements
- Highlights relevant skills and experiences
- Uses industry-appropriate language
- Maintains the same section structure

Return ONLY the tailored CV text. Do not include any explanations, preamble, or commentary.`

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const tailoredCV = completion.choices[0]?.message?.content?.trim()

    if (!tailoredCV) {
      throw new Error('No response from AI for CV tailoring')
    }

    return {
      tailoredText: tailoredCV,
      tokensUsed: completion.usage?.total_tokens,
    }
  } catch (error) {
    console.error('Error generating tailored CV:', error)
    throw error
  }
}

/**
 * Mock enhancement for testing without AI
 */
function enhanceCVForMock(baseCVText: string): string {
  let enhanced = baseCVText

  const enhancements: Array<[RegExp, string]> = [
    [/(\d+) years?/gi, '$1+ years'],
    [/managed/gi, 'effectively managed'],
    [/led/gi, 'successfully led'],
    [/developed/gi, 'designed and developed'],
    [/improved/gi, 'significantly improved'],
    [/increased/gi, 'strategically increased'],
    [/team/gi, 'cross-functional team'],
    [/project/gi, 'high-impact project'],
  ]

  for (const [pattern, replacement] of enhancements) {
    enhanced = enhanced.replace(pattern, replacement)
  }

  return enhanced
}

/**
 * Extract role from job description
 */
function extractRoleFromJobDescription(jobDescription: string): string {
  const lines = jobDescription.split('\n').slice(0, 5)

  for (const line of lines) {
    const cleaned = line.trim()
    if (cleaned.match(/^(senior|junior|lead|principal|staff)?\s*(software|product|marketing|sales|data|project|program|account|customer|operations)/i)) {
      return cleaned.substring(0, 100)
    }
    if (cleaned.length > 5 && cleaned.length < 80 && !cleaned.includes('.')) {
      return cleaned
    }
  }

  return ''
}

/**
 * Quick comparison without full scoring (for previews)
 */
export async function quickCompare(
  baseText: string,
  tailoredText: string,
  jobDescription: string,
  industry: string
): Promise<{
  baseScore: number
  tailoredScore: number
  recommendation: 'base' | 'tailored' | 'equal'
}> {
  const context: ScoringContext = { type: 'cv', industry }

  const [baseResult, tailoredResult] = await Promise.all([
    scoreText(baseText, context),
    scoreText(tailoredText, context),
  ])

  const baseScore = baseResult.success ? baseResult.scores?.overall || 5 : 5
  const tailoredScore = tailoredResult.success ? tailoredResult.scores?.overall || 5 : 5

  let recommendation: 'base' | 'tailored' | 'equal' = 'equal'
  if (tailoredScore > baseScore + 0.5) {
    recommendation = 'tailored'
  } else if (baseScore > tailoredScore + 0.5) {
    recommendation = 'base'
  }

  return { baseScore, tailoredScore, recommendation }
}
