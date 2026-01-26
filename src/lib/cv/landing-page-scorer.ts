/**
 * Landing Page / Formatting Scorer
 *
 * Scores CV based on visual hygiene, ATS compatibility, and formatting.
 * This contributes 30% to the overall weighted score.
 *
 * Scoring Categories:
 * 1. Structure & Organization (25%)
 * 2. ATS Compatibility (25%)
 * 3. Visual Clarity (20%)
 * 4. Content Density (15%)
 * 5. Professional Formatting (15%)
 */

export interface LandingPageMetrics {
  structureScore: number      // Section organization, logical flow
  atsScore: number            // ATS-friendly format, parseable
  visualClarityScore: number  // Whitespace, readability
  contentDensityScore: number // Not too sparse, not too dense
  formattingScore: number     // Consistent formatting, bullet points
  overall: number             // Weighted average
  details: LandingPageDetails
}

export interface LandingPageDetails {
  hasSections: boolean
  sectionCount: number
  hasBulletPoints: boolean
  bulletPointCount: number
  hasContactInfo: boolean
  hasQuantifiableMetrics: boolean
  averageLineLength: number
  emptyLineRatio: number
  wordCount: number
  estimatedPages: number
  hasProperHeaderFormat: boolean
  usesConsistentBulletStyle: boolean
  hasActionVerbs: boolean
  issues: string[]
  strengths: string[]
}

// Common section headers that indicate good structure
const SECTION_HEADERS = [
  'summary', 'objective', 'profile', 'about',
  'experience', 'work experience', 'employment', 'professional experience',
  'education', 'academic', 'qualifications',
  'skills', 'technical skills', 'core competencies', 'expertise',
  'certifications', 'licenses', 'credentials',
  'projects', 'achievements', 'accomplishments',
  'volunteer', 'activities', 'interests',
  'publications', 'awards', 'honors',
  'references', 'professional memberships'
]

// ATS-unfriendly elements
const ATS_RED_FLAGS = [
  /\u2022/g,  // Fancy bullets (should use standard -, *, or •)
  /\t{3,}/g,  // Excessive tabs
  /\|/g,      // Pipe characters (table-like formatting)
  /═|─|│|┌|┐|└|┘/g, // Box drawing characters
  /[\u2500-\u257F]/g, // More box drawing
  /^\s*[A-Z]{2,}\s*$/gm, // ALL CAPS lines (headers should be mixed case)
]

// Action verbs that indicate strong content
const ACTION_VERBS = [
  'achieved', 'administered', 'analyzed', 'built', 'collaborated',
  'coordinated', 'created', 'delivered', 'designed', 'developed',
  'directed', 'established', 'executed', 'generated', 'implemented',
  'improved', 'increased', 'initiated', 'launched', 'led',
  'managed', 'negotiated', 'optimized', 'organized', 'planned',
  'produced', 'reduced', 'resolved', 'spearheaded', 'streamlined',
  'supervised', 'trained', 'transformed'
]

/**
 * Score CV text for Landing Page / Formatting quality
 */
export function scoreLandingPage(cvText: string, isHtml: boolean = false): LandingPageMetrics {
  const details = analyzeCVFormat(cvText, isHtml)

  // Calculate individual scores (1-10 scale)
  const structureScore = calculateStructureScore(details)
  const atsScore = calculateATSScore(cvText, details)
  const visualClarityScore = calculateVisualClarityScore(details)
  const contentDensityScore = calculateContentDensityScore(details)
  const formattingScore = calculateFormattingScore(details)

  // Weighted average for overall Landing Page score
  const overall = (
    structureScore * 0.25 +
    atsScore * 0.25 +
    visualClarityScore * 0.20 +
    contentDensityScore * 0.15 +
    formattingScore * 0.15
  )

  return {
    structureScore: Math.round(structureScore * 10) / 10,
    atsScore: Math.round(atsScore * 10) / 10,
    visualClarityScore: Math.round(visualClarityScore * 10) / 10,
    contentDensityScore: Math.round(contentDensityScore * 10) / 10,
    formattingScore: Math.round(formattingScore * 10) / 10,
    overall: Math.round(overall * 10) / 10,
    details
  }
}

/**
 * Analyze CV format and extract metrics
 */
function analyzeCVFormat(cvText: string, isHtml: boolean): LandingPageDetails {
  const text = isHtml ? stripHtml(cvText) : cvText
  const lines = text.split('\n')
  const nonEmptyLines = lines.filter(l => l.trim().length > 0)
  const emptyLines = lines.filter(l => l.trim().length === 0)

  // Detect sections
  const detectedSections: string[] = []
  for (const line of lines) {
    const cleanLine = line.trim().toLowerCase().replace(/[:\-–—]/g, '').trim()
    if (SECTION_HEADERS.some(header => cleanLine === header || cleanLine.startsWith(header + ' '))) {
      detectedSections.push(line.trim())
    }
  }

  // Detect bullet points
  const bulletPatterns = [
    /^\s*[-•*▸►◆→]\s/,    // Standard bullets
    /^\s*\d+[.)]\s/,       // Numbered lists
    /^\s*[a-z][.)]\s/i,    // Lettered lists
  ]
  const bulletLines = nonEmptyLines.filter(line =>
    bulletPatterns.some(pattern => pattern.test(line))
  )

  // Check for contact info patterns
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text)
  const hasPhone = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)
  const hasLinkedIn = /linkedin\.com/i.test(text)
  const hasContactInfo = hasEmail || hasPhone || hasLinkedIn

  // Check for quantifiable metrics
  const metricsPatterns = [
    /\d+%/,                    // Percentages
    /\$[\d,]+/,                // Dollar amounts
    /\d+\+?\s*(years?|months?)/i, // Time periods
    /\d+\s*(people|team members?|employees?|clients?|customers?)/i, // Team sizes
  ]
  const hasQuantifiableMetrics = metricsPatterns.some(pattern => pattern.test(text))

  // Calculate average line length
  const lineLengths = nonEmptyLines.map(l => l.length)
  const averageLineLength = lineLengths.length > 0
    ? lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length
    : 0

  // Check bullet consistency
  const bulletStyles = new Set<string>()
  bulletLines.forEach(line => {
    const match = line.match(/^\s*([-•*▸►◆→]|\d+[.)]|[a-z][.)])/i)
    if (match) bulletStyles.add(match[1].replace(/\d+/, 'N'))
  })
  const usesConsistentBulletStyle = bulletStyles.size <= 2

  // Check for action verbs
  const hasActionVerbs = ACTION_VERBS.some(verb =>
    new RegExp(`\\b${verb}\\w*\\b`, 'i').test(text)
  )

  // Check header format (not all caps, proper capitalization)
  const hasProperHeaderFormat = detectedSections.every(section => {
    const words = section.split(/\s+/)
    return !words.every(w => w === w.toUpperCase()) // Not all caps
  })

  // Word count and estimated pages
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  const estimatedPages = Math.ceil(wordCount / 500) // ~500 words per page

  // Identify issues and strengths
  const issues: string[] = []
  const strengths: string[] = []

  if (detectedSections.length < 3) {
    issues.push('Limited section organization - consider adding clear section headers')
  } else {
    strengths.push(`Well-organized with ${detectedSections.length} distinct sections`)
  }

  if (!hasContactInfo) {
    issues.push('Missing or hard to parse contact information')
  } else {
    strengths.push('Contact information is present and parseable')
  }

  if (bulletLines.length < 5) {
    issues.push('Limited use of bullet points - consider adding more for readability')
  } else {
    strengths.push(`Good use of bullet points (${bulletLines.length} items)`)
  }

  if (!hasQuantifiableMetrics) {
    issues.push('No quantifiable achievements found - add metrics to strengthen impact')
  } else {
    strengths.push('Includes quantifiable metrics and achievements')
  }

  if (!hasActionVerbs) {
    issues.push('Limited action verbs - use strong verbs like "achieved", "led", "developed"')
  } else {
    strengths.push('Uses strong action verbs')
  }

  if (wordCount < 200) {
    issues.push('CV appears too brief - consider adding more detail')
  } else if (wordCount > 1000) {
    issues.push('CV may be too long - consider condensing to 1-2 pages')
  }

  if (!usesConsistentBulletStyle && bulletLines.length > 3) {
    issues.push('Inconsistent bullet point styles - use a single style throughout')
  }

  return {
    hasSections: detectedSections.length > 0,
    sectionCount: detectedSections.length,
    hasBulletPoints: bulletLines.length > 0,
    bulletPointCount: bulletLines.length,
    hasContactInfo,
    hasQuantifiableMetrics,
    averageLineLength: Math.round(averageLineLength),
    emptyLineRatio: lines.length > 0 ? emptyLines.length / lines.length : 0,
    wordCount,
    estimatedPages,
    hasProperHeaderFormat,
    usesConsistentBulletStyle,
    hasActionVerbs,
    issues,
    strengths
  }
}

/**
 * Calculate structure and organization score
 */
function calculateStructureScore(details: LandingPageDetails): number {
  let score = 5 // Base score

  // Section count bonus
  if (details.sectionCount >= 5) score += 2
  else if (details.sectionCount >= 3) score += 1
  else if (details.sectionCount < 2) score -= 2

  // Proper header format
  if (details.hasProperHeaderFormat) score += 1

  // Contact info
  if (details.hasContactInfo) score += 1

  // Page length
  if (details.estimatedPages >= 1 && details.estimatedPages <= 2) score += 1
  else if (details.estimatedPages > 3) score -= 1

  return Math.max(1, Math.min(10, score))
}

/**
 * Calculate ATS compatibility score
 */
function calculateATSScore(cvText: string, details: LandingPageDetails): number {
  let score = 7 // Start optimistic for plain text

  // Check for ATS red flags
  let redFlagCount = 0
  for (const pattern of ATS_RED_FLAGS) {
    const matches = cvText.match(pattern)
    if (matches) redFlagCount += matches.length
  }

  if (redFlagCount > 10) score -= 3
  else if (redFlagCount > 5) score -= 2
  else if (redFlagCount > 0) score -= 1

  // Good structure helps ATS parsing
  if (details.hasSections) score += 1
  if (details.hasContactInfo) score += 1

  // Standard bullet points are ATS-friendly
  if (details.hasBulletPoints && details.usesConsistentBulletStyle) score += 1

  return Math.max(1, Math.min(10, score))
}

/**
 * Calculate visual clarity score
 */
function calculateVisualClarityScore(details: LandingPageDetails): number {
  let score = 5

  // Good whitespace ratio (15-30% empty lines is ideal)
  if (details.emptyLineRatio >= 0.15 && details.emptyLineRatio <= 0.30) {
    score += 2
  } else if (details.emptyLineRatio < 0.10) {
    score -= 1 // Too dense
  } else if (details.emptyLineRatio > 0.40) {
    score -= 1 // Too sparse
  }

  // Good average line length (40-80 chars is ideal)
  if (details.averageLineLength >= 40 && details.averageLineLength <= 80) {
    score += 2
  } else if (details.averageLineLength < 30 || details.averageLineLength > 100) {
    score -= 1
  }

  // Bullet points improve scannability
  if (details.bulletPointCount >= 10) score += 1
  else if (details.bulletPointCount >= 5) score += 0.5

  // Sections help visual organization
  if (details.sectionCount >= 4) score += 1

  return Math.max(1, Math.min(10, score))
}

/**
 * Calculate content density score
 */
function calculateContentDensityScore(details: LandingPageDetails): number {
  let score = 5

  // Word count (300-800 words is ideal for 1-2 pages)
  if (details.wordCount >= 300 && details.wordCount <= 800) {
    score += 3
  } else if (details.wordCount >= 200 && details.wordCount <= 1000) {
    score += 1
  } else if (details.wordCount < 150) {
    score -= 2 // Too sparse
  } else if (details.wordCount > 1200) {
    score -= 1 // Too dense
  }

  // Quantifiable metrics add value density
  if (details.hasQuantifiableMetrics) score += 1

  // Action verbs indicate strong content
  if (details.hasActionVerbs) score += 1

  return Math.max(1, Math.min(10, score))
}

/**
 * Calculate formatting consistency score
 */
function calculateFormattingScore(details: LandingPageDetails): number {
  let score = 5

  // Consistent bullet style
  if (details.usesConsistentBulletStyle) score += 2
  else if (details.bulletPointCount > 3) score -= 1

  // Proper header format (not all caps)
  if (details.hasProperHeaderFormat) score += 1

  // Good section organization
  if (details.sectionCount >= 4) score += 1

  // Has bullet points at all
  if (details.hasBulletPoints) score += 1

  return Math.max(1, Math.min(10, score))
}

/**
 * Strip HTML tags for text analysis
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get a textual assessment of the Landing Page score
 */
export function getLandingPageAssessment(metrics: LandingPageMetrics): {
  level: 'excellent' | 'good' | 'fair' | 'needs_work'
  summary: string
  topIssue?: string
  topStrength?: string
} {
  const { overall, details } = metrics

  let level: 'excellent' | 'good' | 'fair' | 'needs_work'
  let summary: string

  if (overall >= 8) {
    level = 'excellent'
    summary = 'Your CV has excellent formatting and ATS compatibility.'
  } else if (overall >= 6.5) {
    level = 'good'
    summary = 'Your CV is well-formatted with minor improvements possible.'
  } else if (overall >= 5) {
    level = 'fair'
    summary = 'Your CV formatting is adequate but could be improved for better impact.'
  } else {
    level = 'needs_work'
    summary = 'Your CV formatting needs significant improvement for optimal ATS parsing and readability.'
  }

  return {
    level,
    summary,
    topIssue: details.issues[0],
    topStrength: details.strengths[0]
  }
}
