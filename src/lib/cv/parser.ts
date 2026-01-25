/**
 * CV Parser Utility
 *
 * Parses CV text into structured sections for analysis and comparison.
 * Supports common CV formats across industries.
 */

export interface CVSection {
  name: string
  text: string
  startIndex: number
  endIndex: number
}

export interface ParsedCV {
  sections: CVSection[]
  fullText: string
  sectionCount: number
}

/**
 * Common CV section headers across industries
 */
const SECTION_HEADERS = [
  // Summary/Profile
  'SUMMARY',
  'PROFESSIONAL SUMMARY',
  'EXECUTIVE SUMMARY',
  'PROFILE',
  'PROFESSIONAL PROFILE',
  'CAREER SUMMARY',
  'OBJECTIVE',
  'CAREER OBJECTIVE',

  // Experience
  'EXPERIENCE',
  'WORK EXPERIENCE',
  'PROFESSIONAL EXPERIENCE',
  'EMPLOYMENT HISTORY',
  'WORK HISTORY',
  'CAREER HISTORY',
  'RELEVANT EXPERIENCE',

  // Education
  'EDUCATION',
  'ACADEMIC BACKGROUND',
  'EDUCATIONAL BACKGROUND',
  'ACADEMIC QUALIFICATIONS',
  'QUALIFICATIONS',

  // Skills
  'SKILLS',
  'TECHNICAL SKILLS',
  'CORE COMPETENCIES',
  'KEY SKILLS',
  'PROFESSIONAL SKILLS',
  'AREAS OF EXPERTISE',
  'COMPETENCIES',

  // Certifications
  'CERTIFICATIONS',
  'CERTIFICATES',
  'LICENSES',
  'LICENSES AND CERTIFICATIONS',
  'PROFESSIONAL CERTIFICATIONS',
  'CREDENTIALS',

  // Projects
  'PROJECTS',
  'KEY PROJECTS',
  'SELECTED PROJECTS',
  'PROJECT EXPERIENCE',

  // Achievements
  'ACHIEVEMENTS',
  'ACCOMPLISHMENTS',
  'KEY ACHIEVEMENTS',
  'AWARDS',
  'AWARDS AND HONORS',
  'HONORS',
  'RECOGNITION',

  // Publications
  'PUBLICATIONS',
  'RESEARCH',
  'RESEARCH PUBLICATIONS',
  'PAPERS',

  // Volunteer/Other
  'VOLUNTEER WORK',
  'VOLUNTEER EXPERIENCE',
  'COMMUNITY INVOLVEMENT',
  'EXTRACURRICULAR ACTIVITIES',
  'ACTIVITIES',
  'INTERESTS',
  'HOBBIES',

  // Professional
  'PROFESSIONAL AFFILIATIONS',
  'MEMBERSHIPS',
  'ASSOCIATIONS',
  'PROFESSIONAL MEMBERSHIPS',

  // References
  'REFERENCES',
]

/**
 * Parse CV text into structured sections
 */
export function parseCVIntoSections(cvText: string): CVSection[] {
  if (!cvText || typeof cvText !== 'string') {
    return []
  }

  const sections: CVSection[] = []
  const normalizedText = cvText.trim()

  // Create regex pattern for section headers
  // Match section headers at the start of a line, possibly followed by colon
  const headerPattern = SECTION_HEADERS.map((h) =>
    h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')

  const pattern = new RegExp(`^(${headerPattern})\\s*:?\\s*$`, 'gim')

  const matches: Array<{ header: string; index: number }> = []
  let match

  while ((match = pattern.exec(normalizedText)) !== null) {
    matches.push({
      header: match[0].replace(/:?\s*$/, '').trim(),
      index: match.index,
    })
  }

  if (matches.length === 0) {
    // No clear sections found - check for contact info at top
    // and treat rest as one section
    const lines = normalizedText.split('\n')
    let contentStartIndex = 0

    // Skip initial lines that look like contact info (name, email, phone, etc.)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim()
      if (
        line.match(/@/) || // Email
        line.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) || // Phone
        line.match(/linkedin\.com/i) || // LinkedIn
        line.length < 50 // Short lines likely header info
      ) {
        contentStartIndex = normalizedText.indexOf(lines[i]) + lines[i].length
      } else {
        break
      }
    }

    return [
      {
        name: 'Full CV',
        text: normalizedText.substring(contentStartIndex).trim(),
        startIndex: contentStartIndex,
        endIndex: normalizedText.length,
      },
    ]
  }

  // Extract sections based on header positions
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i]
    const nextMatch = matches[i + 1]

    const startIndex = currentMatch.index
    const endIndex = nextMatch?.index || normalizedText.length

    const sectionText = normalizedText.substring(startIndex, endIndex).trim()

    sections.push({
      name: normalizeSectionName(currentMatch.header),
      text: sectionText,
      startIndex,
      endIndex,
    })
  }

  // If there's content before the first section header, add it as "Header/Contact"
  if (matches.length > 0 && matches[0].index > 0) {
    const preHeaderText = normalizedText.substring(0, matches[0].index).trim()
    if (preHeaderText.length > 10) {
      sections.unshift({
        name: 'Contact Information',
        text: preHeaderText,
        startIndex: 0,
        endIndex: matches[0].index,
      })
    }
  }

  return sections
}

/**
 * Normalize section name for comparison
 */
export function normalizeSectionName(name: string): string {
  // Map variations to canonical names
  const mappings: Record<string, string> = {
    'professional summary': 'Summary',
    'executive summary': 'Summary',
    'career summary': 'Summary',
    profile: 'Summary',
    'professional profile': 'Summary',
    objective: 'Summary',
    'career objective': 'Summary',

    'work experience': 'Experience',
    'professional experience': 'Experience',
    'employment history': 'Experience',
    'work history': 'Experience',
    'career history': 'Experience',
    'relevant experience': 'Experience',

    'academic background': 'Education',
    'educational background': 'Education',
    'academic qualifications': 'Education',
    qualifications: 'Education',

    'technical skills': 'Skills',
    'core competencies': 'Skills',
    'key skills': 'Skills',
    'professional skills': 'Skills',
    'areas of expertise': 'Skills',
    competencies: 'Skills',

    certificates: 'Certifications',
    licenses: 'Certifications',
    'licenses and certifications': 'Certifications',
    'professional certifications': 'Certifications',
    credentials: 'Certifications',

    'key projects': 'Projects',
    'selected projects': 'Projects',
    'project experience': 'Projects',

    accomplishments: 'Achievements',
    'key achievements': 'Achievements',
    awards: 'Achievements',
    'awards and honors': 'Achievements',
    honors: 'Achievements',
    recognition: 'Achievements',

    research: 'Publications',
    'research publications': 'Publications',
    papers: 'Publications',

    'volunteer experience': 'Volunteer Work',
    'community involvement': 'Volunteer Work',

    'professional affiliations': 'Professional Memberships',
    memberships: 'Professional Memberships',
    associations: 'Professional Memberships',
  }

  const lowercaseName = name.toLowerCase().trim()
  return mappings[lowercaseName] || toTitleCase(name)
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Assemble CV from sections
 */
export function assembleCVFromSections(
  sections: Array<{ name: string; text: string }>
): string {
  return sections.map((s) => s.text).join('\n\n')
}

/**
 * Extract bullet points from section text
 */
export function extractBulletPoints(sectionText: string): string[] {
  const lines = sectionText.split('\n')
  const bullets: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match various bullet point formats
    if (
      trimmed.match(/^[-•*→▪▸►◆◇○●]/) || // Bullet characters
      trimmed.match(/^\d+[.)]\s/) || // Numbered lists
      trimmed.match(/^[a-z][.)]\s/i) // Lettered lists
    ) {
      bullets.push(trimmed)
    }
  }

  return bullets
}

/**
 * Get section by normalized name
 */
export function getSectionByName(
  sections: CVSection[],
  name: string
): CVSection | undefined {
  const normalizedSearch = normalizeSectionName(name).toLowerCase()
  return sections.find(
    (s) => normalizeSectionName(s.name).toLowerCase() === normalizedSearch
  )
}

/**
 * Compare section names for matching
 */
export function sectionsMatch(name1: string, name2: string): boolean {
  return (
    normalizeSectionName(name1).toLowerCase() ===
    normalizeSectionName(name2).toLowerCase()
  )
}

/**
 * Calculate text similarity (simple word overlap)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return union.size > 0 ? intersection.size / union.size : 0
}
