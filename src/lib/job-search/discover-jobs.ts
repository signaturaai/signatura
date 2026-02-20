/**
 * Job Discovery Service
 *
 * Uses Google Gemini with web search grounding to discover real open job positions.
 * Builds optimized queries, deduplicates results, and parses structured job data.
 */

import { createHash } from 'crypto'
import type {
  DiscoveredJob,
  ProfileJobSearchFields,
  JobSearchPreferencesRow,
  WorkType,
  ExperienceLevel,
  CompanySize,
  SourcePlatform,
} from '@/types/job-search'
import { getGeminiClient, getSupabaseAdmin } from './clients'

// ============================================================================
// Types
// ============================================================================

interface CandidateProfile extends ProfileJobSearchFields {
  id: string
  full_name?: string | null
  skills?: string[]
}

interface DiscoveryResult {
  jobs: DiscoveredJob[]
  tokenUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  queriesExecuted: number
  duplicatesSkipped: number
}

interface GeminiJobData {
  title?: string
  company_name?: string
  location?: string
  work_type?: string
  experience_level?: string
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  description?: string
  required_skills?: string[]
  benefits?: string[]
  company_size?: string
  source_url?: string
  source_platform?: string
  posted_date?: string
}

// ============================================================================
// Constants
// ============================================================================

const GEMINI_MODEL = 'gemini-2.0-flash'
const MAX_JOBS_PER_QUERY = 25
const MAX_TOTAL_JOBS = 50
const MAX_RETRIES = 3
const QUERY_TIMEOUT_MS = 30000
const CURRENT_YEAR = new Date().getFullYear()

// ============================================================================
// Query Building
// ============================================================================

/**
 * Builds optimized search queries from candidate profile and preferences.
 * Generates 2-3 variations to cast a wider net.
 */
export function buildSearchQueries(
  profile: CandidateProfile,
  prefs: JobSearchPreferencesRow
): string[] {
  const queries: string[] = []

  // Get job titles (prefer preferences, fall back to profile)
  const jobTitles = prefs.preferred_job_titles.length > 0
    ? prefs.preferred_job_titles
    : profile.preferred_job_titles

  // Get locations (prefer preferences, fall back to profile)
  const locations = prefs.preferred_locations.length > 0
    ? prefs.preferred_locations
    : [profile.location_preferences?.city, profile.location_preferences?.country].filter(Boolean)

  // Get skills from profile CV analysis or preferences
  const skills = profile.general_cv_analysis?.skills?.slice(0, 5) || []
  const requiredSkills = prefs.required_skills.map(s => s.skill).slice(0, 3)
  const allSkills = [...new Set([...skills, ...requiredSkills])].slice(0, 5)

  // Get remote preference
  const remotePrefs = prefs.remote_policy_preferences
  const isRemotePreferred = remotePrefs.includes('remote')
  const remoteKeyword = isRemotePreferred ? 'remote' : ''

  // Get industries
  const industries = profile.preferred_industries.slice(0, 2)

  // Query 1: Primary job title + location + skills
  const primaryTitle = jobTitles[0] || 'Software Engineer'
  const primaryLocation = locations[0] || ''
  const topSkills = allSkills.slice(0, 3).join(' ')

  queries.push(
    buildQueryString(primaryTitle, primaryLocation, topSkills, remoteKeyword, industries[0])
  )

  // Query 2: Alternative title (if available) + different skill focus
  if (jobTitles.length > 1) {
    const altTitle = jobTitles[1]
    const altSkills = allSkills.slice(1, 4).join(' ')
    queries.push(
      buildQueryString(altTitle, primaryLocation, altSkills, remoteKeyword, industries[1])
    )
  }

  // Query 3: Broader search with industry focus
  if (industries.length > 0 || allSkills.length > 3) {
    const broaderTitle = primaryTitle
    const industryFocus = industries.join(' ')
    const fewerSkills = allSkills.slice(0, 2).join(' ')
    queries.push(
      buildQueryString(broaderTitle, locations[1] || primaryLocation, fewerSkills, remoteKeyword, industryFocus)
    )
  }

  // Ensure at least 2 queries, max 3
  if (queries.length < 2) {
    // Add a variation with different phrasing
    queries.push(
      `hiring "${primaryTitle}" ${primaryLocation} ${remoteKeyword} open positions ${CURRENT_YEAR}`.trim()
    )
  }

  return queries.slice(0, 3)
}

function buildQueryString(
  title: string,
  location: string,
  skills: string,
  remote: string,
  industry?: string
): string {
  const parts = [
    `"${title}"`,
    skills,
    location ? `"${location}"` : '',
    remote,
    industry || '',
    `open positions ${CURRENT_YEAR}`,
  ].filter(Boolean)

  return parts.join(' ').trim()
}

// ============================================================================
// Content Hashing (Deduplication)
// ============================================================================

/**
 * Generates a content hash for deduplication.
 * Hash: SHA256 of lowercase(title.trim()) + '::' + lowercase(companyName.trim())
 */
export function generateContentHash(title: string, companyName: string): string {
  const normalized = `${title.trim().toLowerCase()}::${companyName.trim().toLowerCase()}`
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32)
}

// ============================================================================
// Response Parsing
// ============================================================================

const VALID_WORK_TYPES: WorkType[] = ['remote', 'hybrid', 'onsite', 'flexible']
const VALID_EXPERIENCE_LEVELS: ExperienceLevel[] = ['entry', 'mid', 'senior', 'executive']
const VALID_COMPANY_SIZES: CompanySize[] = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
const VALID_SOURCE_PLATFORMS: SourcePlatform[] = [
  'LinkedIn', 'Indeed', 'Glassdoor', 'Wellfound', 'Company Website', 'Other'
]

/**
 * Parses Gemini job response from raw text.
 * Handles: valid JSON, JSON in markdown code blocks, malformed JSON.
 * Returns empty array on total failure (never throws).
 */
export function parseGeminiJobResponse(rawText: string): DiscoveredJob[] {
  if (!rawText || typeof rawText !== 'string') {
    return []
  }

  let jsonString = rawText.trim()

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim()
  }

  // Try to find JSON array in the text
  const arrayMatch = jsonString.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    jsonString = arrayMatch[0]
  }

  // Attempt to parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    // Try to repair common JSON issues
    try {
      // Replace single quotes with double quotes
      const repaired = jsonString
        .replace(/'/g, '"')
        // Fix trailing commas
        .replace(/,\s*([}\]])/g, '$1')
        // Fix unquoted keys
        .replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      parsed = JSON.parse(repaired)
    } catch {
      return []
    }
  }

  // Validate and transform the parsed data
  if (!Array.isArray(parsed)) {
    // If it's an object with a jobs array, extract it
    if (parsed && typeof parsed === 'object' && 'jobs' in parsed && Array.isArray((parsed as { jobs: unknown }).jobs)) {
      parsed = (parsed as { jobs: unknown[] }).jobs
    } else {
      return []
    }
  }

  const jobs: DiscoveredJob[] = []
  for (const item of parsed) {
    const job = transformToDiscoveredJob(item as GeminiJobData)
    if (job) {
      jobs.push(job)
    }
  }

  return jobs
}

function transformToDiscoveredJob(data: GeminiJobData): DiscoveredJob | null {
  // Required fields
  if (!data.title || !data.company_name || !data.source_url) {
    return null
  }

  // Validate URL
  try {
    new URL(data.source_url)
  } catch {
    return null
  }

  // Normalize work_type
  let workType: WorkType | null = null
  if (data.work_type) {
    const normalized = data.work_type.toLowerCase().trim()
    if (VALID_WORK_TYPES.includes(normalized as WorkType)) {
      workType = normalized as WorkType
    } else if (normalized.includes('remote')) {
      workType = 'remote'
    } else if (normalized.includes('hybrid')) {
      workType = 'hybrid'
    } else if (normalized.includes('onsite') || normalized.includes('on-site') || normalized.includes('office')) {
      workType = 'onsite'
    }
  }

  // Normalize experience_level
  let experienceLevel: ExperienceLevel | null = null
  if (data.experience_level) {
    const normalized = data.experience_level.toLowerCase().trim()
    if (VALID_EXPERIENCE_LEVELS.includes(normalized as ExperienceLevel)) {
      experienceLevel = normalized as ExperienceLevel
    } else if (normalized.includes('junior') || normalized.includes('entry') || normalized.includes('graduate')) {
      experienceLevel = 'entry'
    } else if (normalized.includes('mid') || normalized.includes('intermediate')) {
      experienceLevel = 'mid'
    } else if (normalized.includes('senior') || normalized.includes('lead')) {
      experienceLevel = 'senior'
    } else if (normalized.includes('executive') || normalized.includes('director') || normalized.includes('vp') || normalized.includes('chief')) {
      experienceLevel = 'executive'
    }
  }

  // Normalize company_size
  let companySize: CompanySize | null = null
  if (data.company_size) {
    const normalized = data.company_size.trim()
    if (VALID_COMPANY_SIZES.includes(normalized as CompanySize)) {
      companySize = normalized as CompanySize
    }
  }

  // Normalize source_platform
  let sourcePlatform: SourcePlatform | null = null
  if (data.source_platform) {
    const normalized = data.source_platform.trim()
    const found = VALID_SOURCE_PLATFORMS.find(
      p => p.toLowerCase() === normalized.toLowerCase()
    )
    sourcePlatform = found || 'Other'
  } else {
    // Try to detect from URL
    const url = data.source_url.toLowerCase()
    if (url.includes('linkedin.com')) sourcePlatform = 'LinkedIn'
    else if (url.includes('indeed.com')) sourcePlatform = 'Indeed'
    else if (url.includes('glassdoor.com')) sourcePlatform = 'Glassdoor'
    else if (url.includes('wellfound.com') || url.includes('angel.co')) sourcePlatform = 'Wellfound'
    else sourcePlatform = 'Company Website'
  }

  // Build the DiscoveredJob
  const job: DiscoveredJob = {
    title: data.title.trim(),
    company_name: data.company_name.trim(),
    source_url: data.source_url.trim(),
    required_skills: Array.isArray(data.required_skills) ? data.required_skills : [],
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    content_hash: generateContentHash(data.title, data.company_name),
  }

  // Optional fields
  if (data.description) {
    job.description = data.description.substring(0, 500)
  }
  if (data.location) {
    job.location = data.location.trim()
  }
  if (workType) {
    job.work_type = workType
  }
  if (experienceLevel) {
    job.experience_level = experienceLevel
  }
  if (typeof data.salary_min === 'number' && data.salary_min >= 0) {
    job.salary_min = data.salary_min
  }
  if (typeof data.salary_max === 'number' && data.salary_max >= 0) {
    job.salary_max = data.salary_max
  }
  if (data.salary_currency) {
    job.salary_currency = data.salary_currency.toUpperCase().substring(0, 3)
  }
  if (companySize) {
    job.company_size = companySize
  }
  if (sourcePlatform) {
    job.source_platform = sourcePlatform
  }
  if (data.posted_date) {
    // Validate date format
    const date = new Date(data.posted_date)
    if (!isNaN(date.getTime())) {
      job.posted_date = date.toISOString().split('T')[0]
    }
  }

  return job
}

// ============================================================================
// Gemini Interaction
// ============================================================================

const SYSTEM_PROMPT = `You are a job search assistant that finds ACTUAL, CURRENTLY OPEN job positions from the web.

IMPORTANT RULES:
1. Only return jobs that appear to be genuinely open and from legitimate sources
2. Only include jobs posted within the last 7 days
3. Extract accurate, structured data for each job
4. Maximum ${MAX_JOBS_PER_QUERY} jobs per search
5. Return ONLY a JSON array, no explanations

For each job found, extract:
{
  "title": "exact job title",
  "company_name": "company name",
  "location": "city, state/country",
  "work_type": "remote" | "hybrid" | "onsite" | "flexible",
  "experience_level": "entry" | "mid" | "senior" | "executive",
  "salary_min": number or null,
  "salary_max": number or null,
  "salary_currency": "USD" | "EUR" | "GBP" | etc,
  "description": "first 500 characters of job description",
  "required_skills": ["skill1", "skill2"],
  "benefits": ["benefit1", "benefit2"],
  "company_size": "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+",
  "source_url": "actual URL to the job posting",
  "source_platform": "LinkedIn" | "Indeed" | "Glassdoor" | "Wellfound" | "Company Website" | "Other",
  "posted_date": "YYYY-MM-DD"
}

Return ONLY the JSON array. Do not include any markdown formatting or explanations.`

async function executeGeminiQuery(
  query: string,
  timeoutMs: number = QUERY_TIMEOUT_MS
): Promise<{ text: string; tokenUsage: { prompt: number; completion: number } }> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    tools: [{ googleSearch: {} }] as unknown[],
  })

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  })

  // Execute with timeout
  const result = await Promise.race([
    model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: `Search for open job positions: ${query}` }] },
      ],
    }),
    timeoutPromise,
  ])

  const response = result.response
  const text = response.text()
  const usage = response.usageMetadata

  return {
    text,
    tokenUsage: {
      prompt: usage?.promptTokenCount || 0,
      completion: usage?.candidatesTokenCount || 0,
    },
  }
}

async function executeWithRetry(
  query: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ text: string; tokenUsage: { prompt: number; completion: number } } | null> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await executeGeminiQuery(query)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if it's a rate limit error
      const isRateLimit = lastError.message.includes('429') ||
        lastError.message.includes('rate limit') ||
        lastError.message.includes('quota')

      if (isRateLimit || lastError.message === 'Query timeout') {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt + 1) * 1000
        console.log(`[JobDiscovery] Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // Non-retryable error
        console.error('[JobDiscovery] Non-retryable error:', lastError.message)
        return null
      }
    }
  }

  console.error('[JobDiscovery] Max retries exceeded:', lastError?.message)
  return null
}

// ============================================================================
// Deduplication
// ============================================================================

async function getExistingHashes(
  userId: string,
  contentHashes: string[]
): Promise<Set<string>> {
  if (contentHashes.length === 0) {
    return new Set()
  }

  const supabase = getSupabaseAdmin()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Query for existing jobs or recently dismissed jobs
  const { data, error } = await supabase
    .from('job_postings')
    .select('content_hash')
    .eq('user_id', userId)
    .in('content_hash', contentHashes)
    .or(`status.neq.dismissed,discarded_until.gt.${thirtyDaysAgo.toISOString()}`)

  if (error) {
    console.error('[JobDiscovery] Error fetching existing hashes:', error.message)
    return new Set()
  }

  return new Set(data?.map(row => row.content_hash).filter(Boolean) || [])
}

// ============================================================================
// Main Discovery Function
// ============================================================================

/**
 * Discovers job postings using Gemini with web search grounding.
 * Returns deduplicated DiscoveredJob objects ready for scoring.
 */
export async function discoverJobs(
  candidateProfile: CandidateProfile,
  searchPreferences: JobSearchPreferencesRow
): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    jobs: [],
    tokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    queriesExecuted: 0,
    duplicatesSkipped: 0,
  }

  try {
    // Build search queries
    const queries = buildSearchQueries(candidateProfile, searchPreferences)
    console.log(`[JobDiscovery] Generated ${queries.length} search queries`)

    const allJobs: DiscoveredJob[] = []
    const seenHashes = new Set<string>()

    // Execute each query
    for (const query of queries) {
      if (allJobs.length >= MAX_TOTAL_JOBS) {
        break
      }

      console.log(`[JobDiscovery] Executing query: ${query.substring(0, 80)}...`)

      const response = await executeWithRetry(query)
      if (!response) {
        continue
      }

      result.queriesExecuted++
      result.tokenUsage.promptTokens += response.tokenUsage.prompt
      result.tokenUsage.completionTokens += response.tokenUsage.completion

      // Parse jobs from response
      const jobs = parseGeminiJobResponse(response.text)
      console.log(`[JobDiscovery] Parsed ${jobs.length} jobs from query`)

      // Local deduplication (within this discovery run)
      for (const job of jobs) {
        if (allJobs.length >= MAX_TOTAL_JOBS) {
          break
        }

        const hash = job.content_hash || generateContentHash(job.title, job.company_name)
        if (seenHashes.has(hash)) {
          result.duplicatesSkipped++
          continue
        }

        seenHashes.add(hash)
        job.content_hash = hash
        allJobs.push(job)
      }
    }

    // Database deduplication
    if (allJobs.length > 0) {
      const hashes = allJobs.map(j => j.content_hash!).filter(Boolean)
      const existingHashes = await getExistingHashes(candidateProfile.id, hashes)

      for (const job of allJobs) {
        if (existingHashes.has(job.content_hash!)) {
          result.duplicatesSkipped++
        } else {
          result.jobs.push(job)
        }
      }
    }

    result.tokenUsage.totalTokens = result.tokenUsage.promptTokens + result.tokenUsage.completionTokens

    console.log(`[JobDiscovery] Complete: ${result.jobs.length} jobs, ${result.duplicatesSkipped} duplicates, ${result.tokenUsage.totalTokens} tokens`)

    return result
  } catch (error) {
    console.error('[JobDiscovery] Fatal error:', error instanceof Error ? error.message : error)
    return result
  }
}
