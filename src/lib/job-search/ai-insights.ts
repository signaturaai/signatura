/**
 * AI Insights Generator
 *
 * Generates AI-powered search intelligence: keywords, recommended boards,
 * market insights, and personalized strategy using OpenAI GPT-4.
 */

import OpenAI from 'openai'
import type {
  SearchInsights,
  ProfileJobSearchFields,
  JobSearchPreferencesRow,
  DiscoveredJob,
} from '@/types/job-search'
import { getSupabaseAdmin } from './clients'

// ============================================================================
// Types
// ============================================================================

interface CandidateProfile extends ProfileJobSearchFields {
  id: string
  full_name?: string | null
  skills?: string[]
}

interface RecommendedBoard {
  name: string
  url: string
  reason: string
}

// ============================================================================
// OpenAI Client (Lazy Initialization)
// ============================================================================

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

// ============================================================================
// Refresh Check
// ============================================================================

const REFRESH_INTERVAL_DAYS = 7

/**
 * Determines if AI insights should be refreshed.
 * Returns true if:
 * - ai_last_analysis_at is null (never analyzed)
 * - More than 7 days since last analysis
 */
export function shouldRefreshInsights(prefs: JobSearchPreferencesRow): boolean {
  if (!prefs.ai_last_analysis_at) {
    return true
  }

  const lastAnalysis = new Date(prefs.ai_last_analysis_at)
  const now = new Date()
  const daysSinceAnalysis = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60 * 60 * 24)

  return daysSinceAnalysis > REFRESH_INTERVAL_DAYS
}

// ============================================================================
// Response Parsers
// ============================================================================

/**
 * Parses keywords response from LLM.
 * Handles: JSON array, comma-separated text, numbered list
 */
export function parseKeywordsResponse(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') {
    return []
  }

  const trimmed = rawText.trim()

  // Try JSON array first
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map(k => String(k).trim()).filter(k => k.length > 0)
    }
  } catch {
    // Not JSON, continue with text parsing
  }

  // Try extracting JSON array from text
  const jsonMatch = trimmed.match(/\[[\s\S]*?\]/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        return parsed.map(k => String(k).trim()).filter(k => k.length > 0)
      }
    } catch {
      // Continue with text parsing
    }
  }

  // Try comma-separated
  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map(k => k.trim().replace(/^["']|["']$/g, '')) // Remove quotes
      .filter(k => k.length > 0 && k.length < 50) // Reasonable keyword length
  }

  // Try newline-separated (numbered list)
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim()) // Remove numbering
      .map(k => k.replace(/^[-•*]\s*/, '').trim()) // Remove bullets
      .filter(k => k.length > 0 && k.length < 50)
  }

  // Single keyword or space-separated short items
  const words = trimmed.split(/\s+/)
  if (words.length <= 15 && words.every(w => w.length < 30)) {
    return words.filter(w => w.length > 0)
  }

  return []
}

/**
 * Parses recommended boards response from LLM.
 * Expects JSON array of { name, url, reason } objects.
 */
export function parseBoardsResponse(rawText: string): RecommendedBoard[] {
  if (!rawText || typeof rawText !== 'string') {
    return []
  }

  const trimmed = rawText.trim()

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return validateBoardsArray(parsed)
    }
  } catch {
    // Not JSON, try extraction
  }

  // Try extracting JSON array from text (handles markdown code blocks)
  const jsonMatch = trimmed.match(/\[[\s\S]*?\]/g)
  if (jsonMatch) {
    for (const match of jsonMatch) {
      try {
        const parsed = JSON.parse(match)
        if (Array.isArray(parsed)) {
          const boards = validateBoardsArray(parsed)
          if (boards.length > 0) {
            return boards
          }
        }
      } catch {
        continue
      }
    }
  }

  return []
}

function validateBoardsArray(arr: unknown[]): RecommendedBoard[] {
  return arr
    .filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null
    )
    .filter(item =>
      typeof item.name === 'string' &&
      typeof item.url === 'string' &&
      typeof item.reason === 'string'
    )
    .map(item => ({
      name: String(item.name).trim(),
      url: String(item.url).trim(),
      reason: String(item.reason).trim(),
    }))
    .filter(board =>
      board.name.length > 0 &&
      board.url.length > 0 &&
      board.reason.length > 0
    )
}

// ============================================================================
// Prompts
// ============================================================================

function buildKeywordsPrompt(
  profile: CandidateProfile,
  prefs: JobSearchPreferencesRow
): string {
  const skills = profile.general_cv_analysis?.skills || profile.skills || []
  const industries = profile.preferred_industries || []
  const titles = prefs.preferred_job_titles.length > 0
    ? prefs.preferred_job_titles
    : profile.preferred_job_titles

  return `Based on this candidate profile, generate 8-15 strategic job search keywords that will help them find relevant positions.

Profile:
- Target roles: ${titles.join(', ') || 'Not specified'}
- Skills: ${skills.slice(0, 10).join(', ') || 'Not specified'}
- Industries: ${industries.join(', ') || 'Open to all'}
- Experience level: ${profile.general_cv_analysis?.seniority_level || 'Not specified'}
- Career goals: ${profile.career_goals || 'Not specified'}

Return ONLY a JSON array of keyword strings, like: ["keyword1", "keyword2", ...]
Include mix of:
- Role variations and synonyms
- Key technical skills
- Industry-specific terms
- Trending/in-demand skills in their field`
}

function buildBoardsPrompt(
  profile: CandidateProfile,
  prefs: JobSearchPreferencesRow
): string {
  const skills = profile.general_cv_analysis?.skills || profile.skills || []
  const industries = profile.preferred_industries || []
  const titles = prefs.preferred_job_titles.length > 0
    ? prefs.preferred_job_titles
    : profile.preferred_job_titles

  return `Recommend 5-8 job boards or platforms for this candidate. Focus on boards that match their specific profile.

Profile:
- Target roles: ${titles.join(', ') || 'Not specified'}
- Skills: ${skills.slice(0, 8).join(', ') || 'Not specified'}
- Industries: ${industries.join(', ') || 'Open to all'}
- Experience level: ${profile.general_cv_analysis?.seniority_level || 'Not specified'}
- Remote preference: ${prefs.remote_policy_preferences.join(', ') || 'Flexible'}

Return ONLY a JSON array with this exact structure:
[
  {"name": "Board Name", "url": "https://...", "reason": "Why this board is good for them"}
]

Include a mix of:
- General boards (LinkedIn, Indeed)
- Niche/specialized boards for their industry
- Remote-specific boards if they want remote
- Startup-focused boards if interested in startups`
}

function buildMarketInsightsPrompt(
  profile: CandidateProfile,
  recentJobs: DiscoveredJob[]
): string {
  const skills = profile.general_cv_analysis?.skills || profile.skills || []
  const titles = profile.preferred_job_titles
  const avgSalary = recentJobs.length > 0
    ? Math.round(recentJobs.filter(j => j.salary_min).reduce((sum, j) => sum + (j.salary_min || 0), 0) / Math.max(1, recentJobs.filter(j => j.salary_min).length))
    : null

  return `Provide a brief market insight (2-3 sentences) for this job seeker.

Profile:
- Target roles: ${titles.join(', ') || 'General'}
- Key skills: ${skills.slice(0, 5).join(', ') || 'Various'}
- Recent job findings: ${recentJobs.length} positions found
${avgSalary ? `- Average salary range seen: ~$${avgSalary.toLocaleString()}` : ''}

Focus on:
- Current demand for their skills
- Salary trends if relevant
- Competitive landscape

Keep it actionable and encouraging. Return ONLY the 2-3 sentence paragraph, no JSON or formatting.`
}

function buildStrategyPrompt(
  profile: CandidateProfile,
  prefs: JobSearchPreferencesRow,
  recentJobs: DiscoveredJob[]
): string {
  const skills = profile.general_cv_analysis?.skills || profile.skills || []
  const matchedCount = recentJobs.length

  return `Provide a personalized job search strategy (2-3 sentences) for this candidate.

Profile:
- Target roles: ${prefs.preferred_job_titles.join(', ') || profile.preferred_job_titles.join(', ') || 'Various'}
- Key skills: ${skills.slice(0, 5).join(', ') || 'Various'}
- Experience: ${profile.general_cv_analysis?.experience_years || 'Not specified'} years
- Recent matches found: ${matchedCount}
- Remote preference: ${prefs.remote_policy_preferences.join(', ') || 'Flexible'}

Provide specific, actionable advice. Consider:
- How to stand out in applications
- Which skills to highlight
- Networking suggestions
- Timing/approach recommendations

Return ONLY the 2-3 sentence recommendation, no JSON or formatting.`
}

// ============================================================================
// LLM Calls
// ============================================================================

async function generateKeywords(
  profile: CandidateProfile,
  prefs: JobSearchPreferencesRow
): Promise<string[]> {
  try {
    const client = getOpenAI()
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a job search strategist. Return only the requested format.' },
        { role: 'user', content: buildKeywordsPrompt(profile, prefs) },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const text = response.choices[0]?.message?.content || ''
    return parseKeywordsResponse(text)
  } catch (error) {
    console.error('[AIInsights] Error generating keywords:', error)
    return []
  }
}

async function generateBoards(
  profile: CandidateProfile,
  prefs: JobSearchPreferencesRow
): Promise<RecommendedBoard[]> {
  try {
    const client = getOpenAI()
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a job search strategist. Return only valid JSON arrays.' },
        { role: 'user', content: buildBoardsPrompt(profile, prefs) },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    const text = response.choices[0]?.message?.content || ''
    return parseBoardsResponse(text)
  } catch (error) {
    console.error('[AIInsights] Error generating boards:', error)
    return []
  }
}

async function generateMarketInsights(
  profile: CandidateProfile,
  recentJobs: DiscoveredJob[]
): Promise<string> {
  try {
    const client = getOpenAI()
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a job market analyst. Be concise and encouraging.' },
        { role: 'user', content: buildMarketInsightsPrompt(profile, recentJobs) },
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    return response.choices[0]?.message?.content?.trim() || ''
  } catch (error) {
    console.error('[AIInsights] Error generating market insights:', error)
    return ''
  }
}

async function generateStrategy(
  profile: CandidateProfile,
  prefs: JobSearchPreferencesRow,
  recentJobs: DiscoveredJob[]
): Promise<string> {
  try {
    const client = getOpenAI()
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a career coach. Be specific and actionable.' },
        { role: 'user', content: buildStrategyPrompt(profile, prefs, recentJobs) },
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    return response.choices[0]?.message?.content?.trim() || ''
  } catch (error) {
    console.error('[AIInsights] Error generating strategy:', error)
    return ''
  }
}

// ============================================================================
// Cache Update
// ============================================================================

async function cacheInsights(
  userId: string,
  insights: SearchInsights
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase
      .from('job_search_preferences')
      .update({
        ai_keywords: insights.keywords,
        ai_recommended_boards: insights.recommendedBoards,
        ai_market_insights: insights.marketInsights,
        ai_personalized_strategy: insights.personalizedStrategy,
        ai_last_analysis_at: insights.generatedAt,
      })
      .eq('user_id', userId)
  } catch (error) {
    console.error('[AIInsights] Error caching insights:', error)
  }
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates AI-powered search intelligence for a candidate.
 * Results are cached in job_search_preferences.
 */
export async function generateSearchInsights(
  candidateProfile: CandidateProfile,
  searchPreferences: JobSearchPreferencesRow,
  recentJobs: DiscoveredJob[] = []
): Promise<SearchInsights> {
  console.log(`[AIInsights] Generating insights for user ${candidateProfile.id}`)

  // Run all generations in parallel for speed
  const [keywords, boards, marketInsights, strategy] = await Promise.all([
    generateKeywords(candidateProfile, searchPreferences),
    generateBoards(candidateProfile, searchPreferences),
    generateMarketInsights(candidateProfile, recentJobs),
    generateStrategy(candidateProfile, searchPreferences, recentJobs),
  ])

  const insights: SearchInsights = {
    keywords,
    recommendedBoards: boards,
    marketInsights,
    personalizedStrategy: strategy,
    generatedAt: new Date().toISOString(),
  }

  // Cache results
  await cacheInsights(candidateProfile.id, insights)

  console.log(`[AIInsights] Generated ${keywords.length} keywords, ${boards.length} boards`)

  return insights
}
