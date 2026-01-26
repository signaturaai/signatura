/**
 * CV Tailoring Engine - Best of Both Worlds
 *
 * Core principle: The tailored CV must NEVER be worse than the original.
 *
 * "Holy Trinity" Scoring Philosophy:
 * - A CV's score is a WEIGHTED AVERAGE of THREE components:
 *   - Core Content (50%): The 10-Indicator semantic quality
 *   - ATS Score (30%): Keyword matching and ATS compatibility
 *   - Landing Page (20%): Visual hygiene and formatting
 *
 * Fallback Logic:
 * - If ATS Score is 0 (missing), fallback to: (Core * 0.7) + (LP * 0.3)
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

// Holy Trinity Scoring Weights
const CORE_WEIGHT = 0.50
const ATS_WEIGHT = 0.30
const LANDING_PAGE_WEIGHT = 0.20

// Fallback weights (when ATS is missing)
const FALLBACK_CORE_WEIGHT = 0.70
const FALLBACK_LP_WEIGHT = 0.30

/**
 * Comprehensive score structure for Holy Trinity comparison
 */
export interface CVScore {
  overall_score: number       // Weighted: Holy Trinity or Fallback
  core_score: number          // Average of 10 indicators (50%)
  ats_score: number           // ATS keyword matching score (30%)
  landing_page_score: number  // Formatting score (20%)
  indicator_scores: IndicatorScoreEntry[]
  landing_page_metrics?: LandingPageMetrics
  ats_details?: ATSAnalysisDetails
}

export interface IndicatorScoreEntry {
  indicator_number: number
  indicator_name: string
  score: number
  evidence?: string
  suggestion?: string
}

/**
 * ATS Analysis Details
 */
export interface ATSAnalysisDetails {
  keywordsFound: string[]
  keywordsMissing: string[]
  matchPercentage: number
  totalKeywords: number
  matchedKeywords: number
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
 * Calculate weighted overall score using Holy Trinity formula
 * Formula: (Core × 0.5) + (ATS × 0.3) + (Landing Page × 0.2)
 * Fallback: If ATS = 0, use (Core × 0.7) + (LP × 0.3)
 */
function calculateWeightedScore(
  coreScore: number,
  atsScore: number,
  landingPageScore: number
): number {
  // Fallback to 70/30 if ATS score is missing (0)
  if (atsScore === 0) {
    console.log('ATS score missing, using fallback 70/30 formula')
    return Math.round(
      (coreScore * FALLBACK_CORE_WEIGHT + landingPageScore * FALLBACK_LP_WEIGHT) * 10
    ) / 10
  }

  // Holy Trinity formula: 50/30/20
  return Math.round(
    (coreScore * CORE_WEIGHT + atsScore * ATS_WEIGHT + landingPageScore * LANDING_PAGE_WEIGHT) * 10
  ) / 10
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
 * ATS Analysis - Strict Mode (Keyword Counting)
 * Uses temperature: 0.0 for deterministic scoring
 *
 * Extracts keywords from job description and counts matches in CV.
 * Produces a differentiated score between Base and Tailored CVs.
 */
export async function analyzeATS(
  cvText: string,
  jobDescription: string
): Promise<{ score: number; details: ATSAnalysisDetails }> {
  const useMock = process.env.USE_MOCK_AI === 'true'

  if (useMock) {
    return getMockATSScore(cvText, jobDescription)
  }

  try {
    const prompt = `You are an ATS (Applicant Tracking System) keyword analyzer.

TASK: Analyze how well the CV matches the job description keywords.

JOB DESCRIPTION:
${jobDescription}

CV TEXT:
${cvText}

INSTRUCTIONS:
1. Extract the TOP 20 most important keywords/phrases from the job description
2. Count how many of these keywords appear in the CV (exact or close semantic match)
3. Calculate a match percentage
4. Provide a score from 1.0 to 10.0 based on keyword coverage

CRITICAL: Be STRICT in your scoring. Differentiate clearly between CVs that have good keyword coverage vs poor coverage.

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 1.0-10.0>,
  "keywordsFound": ["keyword1", "keyword2", ...],
  "keywordsMissing": ["keyword1", "keyword2", ...],
  "matchPercentage": <number 0-100>,
  "totalKeywords": <number>,
  "matchedKeywords": <number>
}`

    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0, // CRITICAL: Deterministic scoring
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    if (!responseText) {
      throw new Error('No response from ATS analyzer')
    }

    const result = JSON.parse(responseText)

    return {
      score: Math.max(1, Math.min(10, result.score || 5)),
      details: {
        keywordsFound: result.keywordsFound || [],
        keywordsMissing: result.keywordsMissing || [],
        matchPercentage: result.matchPercentage || 0,
        totalKeywords: result.totalKeywords || 0,
        matchedKeywords: result.matchedKeywords || 0,
      },
    }
  } catch (error) {
    console.error('ATS analysis error:', error)
    // Fallback to heuristic scoring
    return getMockATSScore(cvText, jobDescription)
  }
}

/**
 * Mock/Heuristic ATS scoring for testing or fallback
 */
function getMockATSScore(
  cvText: string,
  jobDescription: string
): { score: number; details: ATSAnalysisDetails } {
  const cvLower = cvText.toLowerCase()
  const jobLower = jobDescription.toLowerCase()

  // Extract significant words from job description (3+ chars, not common words)
  const commonWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will',
    'are', 'you', 'our', 'your', 'can', 'all', 'been', 'would', 'there',
    'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time',
    'just', 'know', 'take', 'come', 'could', 'work', 'year', 'over',
    'such', 'into', 'other', 'than', 'then', 'now', 'look', 'only',
    'new', 'more', 'also', 'after', 'use', 'well', 'way', 'want',
    'because', 'any', 'these', 'give', 'day', 'most', 'ability', 'able'
  ])

  const jobWords = jobLower
    .split(/[\s,;:.!?()[\]{}'"]+/)
    .filter(w => w.length >= 3 && !commonWords.has(w))

  // Get unique keywords
  const keywords = [...new Set(jobWords)].slice(0, 20)

  // Count matches
  const found: string[] = []
  const missing: string[] = []

  for (const keyword of keywords) {
    if (cvLower.includes(keyword)) {
      found.push(keyword)
    } else {
      missing.push(keyword)
    }
  }

  const matchPercentage = keywords.length > 0
    ? Math.round((found.length / keywords.length) * 100)
    : 0

  // Score based on match percentage (stricter scoring)
  let score: number
  if (matchPercentage >= 80) score = 9
  else if (matchPercentage >= 70) score = 8
  else if (matchPercentage >= 60) score = 7
  else if (matchPercentage >= 50) score = 6
  else if (matchPercentage >= 40) score = 5
  else if (matchPercentage >= 30) score = 4
  else if (matchPercentage >= 20) score = 3
  else score = 2

  return {
    score,
    details: {
      keywordsFound: found,
      keywordsMissing: missing,
      matchPercentage,
      totalKeywords: keywords.length,
      matchedKeywords: found.length,
    },
  }
}

/**
 * Perform initial analysis on a CV (Base/Original)
 * Sequential execution: Core -> await -> Landing Page -> await -> ATS
 * This implements the "Holy Trinity" scoring (50/30/20)
 *
 * @param cvText - The CV text to analyze
 * @param jobDescription - Job description for ATS keyword matching (optional for fallback)
 * @param industry - Industry context for scoring
 * @param isHtml - Whether the CV is in HTML format
 */
export async function analyzeInitialCV(
  cvText: string,
  jobDescription: string = '',
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

    // STEP 1: Score Core Content (10 Indicators) - SEQUENTIAL
    console.log('Step 1: Scoring Core Content...')
    const context: ScoringContext = { type: 'cv', industry }
    const coreResult = await scoreText(cvText, context)

    const indicatorEntries = convertToIndicatorEntries(coreResult.scores || null)
    const coreScore = coreResult.success
      ? coreResult.scores?.overall || calculateCoreAverage(indicatorEntries)
      : 5

    // STEP 2: Score Landing Page (Formatting) - SEQUENTIAL
    console.log('Step 2: Scoring Landing Page...')
    const landingPageMetrics = scoreLandingPage(cvText, isHtml)
    const landingPageScore = landingPageMetrics.overall

    // STEP 3: Score ATS (Keyword Matching) - SEQUENTIAL
    console.log('Step 3: Scoring ATS...')
    let atsScore = 0
    let atsDetails: ATSAnalysisDetails | undefined

    if (jobDescription && jobDescription.trim().length > 0) {
      const atsResult = await analyzeATS(cvText, jobDescription)
      atsScore = atsResult.score
      atsDetails = atsResult.details
    }

    // Calculate weighted overall score using Holy Trinity (or fallback)
    const overallScore = calculateWeightedScore(coreScore, atsScore, landingPageScore)

    console.log(`Initial Analysis: Core=${coreScore}, ATS=${atsScore}, LandingPage=${landingPageScore}, Overall=${overallScore}`)

    return {
      success: true,
      scores: {
        overall_score: overallScore,
        core_score: coreScore,
        ats_score: atsScore,
        landing_page_score: landingPageScore,
        indicator_scores: indicatorEntries,
        landing_page_metrics: landingPageMetrics,
        ats_details: atsDetails,
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
 * Create empty score structure (Holy Trinity)
 */
function createEmptyScore(): CVScore {
  return {
    overall_score: 0,
    core_score: 0,
    ats_score: 0,
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
 * Holy Trinity Process (Sequential Execution):
 * 1. Run initial analysis on base CV (Core -> Landing Page -> ATS)
 * 2. Generate AI-tailored CV
 * 3. Score tailored CV on the NEW generated text (Core -> Landing Page -> ATS)
 * 4. Apply non-regression: For each indicator, final = MAX(base, tailored)
 * 5. Calculate final weighted score using Holy Trinity (50/30/20)
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

    // STEP 1: Initial Analysis of Base CV (Holy Trinity: Core -> LP -> ATS)
    console.log('Step 1: Analyzing base CV (Core -> Landing Page -> ATS)...')
    const initialAnalysis = await analyzeInitialCV(baseCVText, jobDescription, industry, false)

    if (!initialAnalysis.success) {
      return createErrorResult(initialAnalysis.error || 'Initial analysis failed', baseCVText, startTime)
    }

    const initialScores = initialAnalysis.scores
    console.log(`Base CV: Core=${initialScores.core_score}, ATS=${initialScores.ats_score}, LandingPage=${initialScores.landing_page_score}, Overall=${initialScores.overall_score}`)

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

    // STEP 5: Score tailored CV (Core indicators) - SEQUENTIAL
    // CRITICAL: Score the NEW tailoredText, not the original baseCVText
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

    // STEP 6: Score tailored CV (Landing Page) - SEQUENTIAL
    console.log('Step 6: Scoring tailored CV (Landing Page)...')
    const tailoredLandingMetrics = scoreLandingPage(tailoredText, false)
    const tailoredLandingScore = tailoredLandingMetrics.overall

    // STEP 7: Score tailored CV (ATS) - SEQUENTIAL
    // CRITICAL: Score the NEW tailoredText for keyword matching
    console.log('Step 7: Scoring tailored CV (ATS)...')
    const tailoredATSResult = await analyzeATS(tailoredText, jobDescription)
    const tailoredATSScore = tailoredATSResult.score
    const tailoredATSDetails = tailoredATSResult.details

    console.log(`Tailored CV: Core=${tailoredCoreScore}, ATS=${tailoredATSScore}, LandingPage=${tailoredLandingScore}`)

    // STEP 8: Apply non-regression logic (Best of Both Worlds)
    console.log('Step 8: Applying non-regression logic (Best of Both Worlds)...')
    const bestOfBothIndicators = applyNonRegressionLogic(
      initialScores.indicator_scores,
      tailoredIndicatorEntries
    )

    // Calculate best-of-both scores (use MAX for each metric)
    const bestOfBothCoreScore = calculateCoreAverage(bestOfBothIndicators)
    const finalATSScore = Math.max(initialScores.ats_score, tailoredATSScore)
    const finalLandingScore = Math.max(initialScores.landing_page_score, tailoredLandingScore)

    // Calculate final weighted score using Holy Trinity
    const finalOverallScore = calculateWeightedScore(bestOfBothCoreScore, finalATSScore, finalLandingScore)

    console.log(`Best of Both: Core=${bestOfBothCoreScore}, ATS=${finalATSScore}, LandingPage=${finalLandingScore}, Overall=${finalOverallScore}`)

    // STEP 9: Compare sections and choose best versions
    console.log('Step 9: Comparing sections and choosing best versions...')
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

    // STEP 10: Assemble final CV
    console.log('Step 10: Assembling final CV from best sections...')
    const finalCVText = assembleCVFromSections(finalSections)

    // Build final scores object (Holy Trinity)
    const finalScores: CVScore = {
      overall_score: finalOverallScore,
      core_score: bestOfBothCoreScore,
      ats_score: finalATSScore,
      landing_page_score: finalLandingScore,
      indicator_scores: bestOfBothIndicators,
      landing_page_metrics: tailoredLandingMetrics,
      ats_details: tailoredATSDetails,
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
      tailoredOverallScore: calculateWeightedScore(tailoredCoreScore, tailoredATSScore, tailoredLandingScore),
      finalOverallScore,
      overallImprovement,
      // New comprehensive scores (Holy Trinity)
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
