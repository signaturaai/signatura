/**
 * CV Tailoring Engine - Best of Both Worlds
 *
 * Core principle: The tailored CV must NEVER be worse than the original.
 * We compare each section and use whichever version scores higher.
 */

import OpenAI from 'openai'
import { scoreText, ScoringContext } from '@/lib/indicators/scorer'
import { IndicatorScores } from '@/lib/indicators/types'
import {
  parseCVIntoSections,
  assembleCVFromSections,
  CVSection,
  sectionsMatch,
} from './parser'

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
 * Full tailoring result
 */
export interface TailoringResult {
  success: boolean
  error?: string
  finalCVText: string
  sectionComparisons: SectionComparison[]
  baseOverallScore: number
  tailoredOverallScore: number
  finalOverallScore: number
  overallImprovement: number
  sectionsImproved: number
  sectionsKeptOriginal: number
  totalSections: number
  processingTimeMs: number
  tokensUsed?: number
}

/**
 * Generate a "Best of Both Worlds" tailored CV
 *
 * This function:
 * 1. Parses the base CV into sections
 * 2. Generates a fully tailored version
 * 3. Scores both versions section-by-section
 * 4. Picks the best version of each section
 * 5. Guarantees final score >= base score
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
      return {
        success: false,
        error: 'Base CV text is too short (minimum 100 characters)',
        finalCVText: baseCVText,
        sectionComparisons: [],
        baseOverallScore: 0,
        tailoredOverallScore: 0,
        finalOverallScore: 0,
        overallImprovement: 0,
        sectionsImproved: 0,
        sectionsKeptOriginal: 0,
        totalSections: 0,
        processingTimeMs: Date.now() - startTime,
      }
    }

    if (!jobDescription || jobDescription.trim().length < 50) {
      return {
        success: false,
        error: 'Job description is too short (minimum 50 characters)',
        finalCVText: baseCVText,
        sectionComparisons: [],
        baseOverallScore: 0,
        tailoredOverallScore: 0,
        finalOverallScore: 0,
        overallImprovement: 0,
        sectionsImproved: 0,
        sectionsKeptOriginal: 0,
        totalSections: 0,
        processingTimeMs: Date.now() - startTime,
      }
    }

    console.log('Step 1: Parsing base CV into sections...')
    const baseSections = parseCVIntoSections(baseCVText)
    console.log(`Found ${baseSections.length} sections in base CV`)

    // Score full base CV first
    console.log('Step 2: Scoring base CV overall...')
    const baseContext: ScoringContext = {
      type: 'cv',
      industry,
      role: extractRoleFromJobDescription(jobDescription),
    }

    const baseOverallResult = await scoreText(baseCVText, baseContext)
    const baseOverallScore = baseOverallResult.success
      ? baseOverallResult.scores?.overall || 5
      : 5

    console.log(`Base CV overall score: ${baseOverallScore}`)

    // Generate tailored CV
    console.log('Step 3: Generating fully tailored CV...')
    const { tailoredText, tokensUsed } = await generateTailoredCVWithAI(
      baseCVText,
      jobDescription,
      industry
    )
    totalTokens += tokensUsed || 0

    console.log('Step 4: Parsing tailored CV into sections...')
    const tailoredSections = parseCVIntoSections(tailoredText)
    console.log(`Found ${tailoredSections.length} sections in tailored CV`)

    // Score tailored CV overall
    console.log('Step 5: Scoring tailored CV overall...')
    const tailoredOverallResult = await scoreText(tailoredText, baseContext)
    const tailoredOverallScore = tailoredOverallResult.success
      ? tailoredOverallResult.scores?.overall || 5
      : 5

    console.log(`Tailored CV overall score: ${tailoredOverallScore}`)

    // Compare sections and choose best versions
    console.log('Step 6: Comparing sections and choosing best versions...')
    const sectionComparisons: SectionComparison[] = []
    const finalSections: Array<{ name: string; text: string }> = []
    let sectionsImproved = 0
    let sectionsKeptOriginal = 0

    for (const baseSection of baseSections) {
      // Find matching section in tailored CV
      const tailoredSection = tailoredSections.find((ts) =>
        sectionsMatch(ts.name, baseSection.name)
      )

      if (!tailoredSection) {
        // Tailored CV missing this section - keep original
        finalSections.push({
          name: baseSection.name,
          text: baseSection.text,
        })

        sectionComparisons.push({
          sectionName: baseSection.name,
          base: { text: baseSection.text, score: baseOverallScore },
          tailored: { text: '', score: 0 },
          chosen: 'base',
          improvement: 0,
          reason: 'Section not found in tailored version - keeping original',
        })

        sectionsKeptOriginal++
        continue
      }

      // Score both sections
      const baseSectionScore = await scoreSectionText(
        baseSection.text,
        jobDescription,
        industry
      )
      const tailoredSectionScore = await scoreSectionText(
        tailoredSection.text,
        jobDescription,
        industry
      )

      // Choose the better version
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

      if (useTailored) {
        sectionsImproved++
      } else {
        sectionsKeptOriginal++
      }
    }

    // Check for any new sections in tailored CV that weren't in base
    for (const tailoredSection of tailoredSections) {
      const hasMatch = baseSections.some((bs) =>
        sectionsMatch(bs.name, tailoredSection.name)
      )

      if (!hasMatch && tailoredSection.text.length > 50) {
        // New section added by tailoring - score it
        const newSectionScore = await scoreSectionText(
          tailoredSection.text,
          jobDescription,
          industry
        )

        // Only add if it has a good score
        if (newSectionScore >= 5) {
          finalSections.push({
            name: tailoredSection.name,
            text: tailoredSection.text,
          })

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

    // Assemble final CV
    console.log('Step 7: Assembling final CV from best sections...')
    const finalCVText = assembleCVFromSections(finalSections)

    // Final validation score
    console.log('Step 8: Final validation...')
    const finalOverallResult = await scoreText(finalCVText, baseContext)
    let finalOverallScore = finalOverallResult.success
      ? finalOverallResult.scores?.overall || baseOverallScore
      : baseOverallScore

    // SAFETY NET: If final score is somehow worse than base, use base CV
    if (finalOverallScore < baseOverallScore) {
      console.warn(
        `WARNING: Final CV scored ${finalOverallScore} vs base ${baseOverallScore}. ` +
          `Using base CV as safety fallback.`
      )

      return {
        success: true,
        finalCVText: baseCVText,
        sectionComparisons: sectionComparisons.map((sc) => ({
          ...sc,
          chosen: 'base' as const,
          improvement: 0,
          reason: 'Safety fallback: Original CV preserved',
        })),
        baseOverallScore,
        tailoredOverallScore,
        finalOverallScore: baseOverallScore,
        overallImprovement: 0,
        sectionsImproved: 0,
        sectionsKeptOriginal: baseSections.length,
        totalSections: baseSections.length,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: totalTokens,
      }
    }

    console.log(
      `Success! Final score: ${finalOverallScore} (improvement: +${(finalOverallScore - baseOverallScore).toFixed(1)})`
    )

    return {
      success: true,
      finalCVText,
      sectionComparisons,
      baseOverallScore,
      tailoredOverallScore,
      finalOverallScore,
      overallImprovement: finalOverallScore - baseOverallScore,
      sectionsImproved,
      sectionsKeptOriginal,
      totalSections: sectionComparisons.length,
      processingTimeMs: Date.now() - startTime,
      tokensUsed: totalTokens,
    }
  } catch (error) {
    console.error('CV tailoring error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      finalCVText: baseCVText,
      sectionComparisons: [],
      baseOverallScore: 0,
      tailoredOverallScore: 0,
      finalOverallScore: 0,
      overallImprovement: 0,
      sectionsImproved: 0,
      sectionsKeptOriginal: 0,
      totalSections: 0,
      processingTimeMs: Date.now() - startTime,
    }
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

  const context: ScoringContext = {
    type: 'cv',
    industry,
  }

  // For short sections, use a simpler scoring approach
  if (sectionText.length < 100) {
    // Quick heuristic scoring for very short sections
    let score = 5

    // Check for numbers (quantifiable achievements)
    if (sectionText.match(/\d+%|\$\d+|\d+ years?|\d+ (people|team|projects?)/i)) {
      score += 1
    }

    // Check for action verbs
    const actionVerbs = [
      'led',
      'managed',
      'developed',
      'created',
      'implemented',
      'increased',
      'reduced',
      'improved',
      'achieved',
      'delivered',
    ]
    if (actionVerbs.some((v) => sectionText.toLowerCase().includes(v))) {
      score += 0.5
    }

    return Math.min(10, score)
  }

  try {
    const result = await scoreText(sectionText, context)
    return result.success ? result.scores?.overall || 5 : 5
  } catch {
    return 5 // Default score on error
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
    // Mock: return enhanced version for testing
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

  // Add some keywords to simulate tailoring
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
  // Try to find job title in first few lines
  const lines = jobDescription.split('\n').slice(0, 5)

  for (const line of lines) {
    const cleaned = line.trim()
    // Common job title patterns
    if (
      cleaned.match(
        /^(senior|junior|lead|principal|staff)?\s*(software|product|marketing|sales|data|project|program|account|customer|operations)/i
      )
    ) {
      return cleaned.substring(0, 100)
    }
    // Short lines that might be titles
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
  const tailoredScore = tailoredResult.success
    ? tailoredResult.scores?.overall || 5
    : 5

  let recommendation: 'base' | 'tailored' | 'equal' = 'equal'
  if (tailoredScore > baseScore + 0.5) {
    recommendation = 'tailored'
  } else if (baseScore > tailoredScore + 0.5) {
    recommendation = 'base'
  }

  return { baseScore, tailoredScore, recommendation }
}
