/**
 * Job Match Scoring Service
 *
 * Multi-factor matching algorithm that scores discovered jobs against
 * candidate profile and preferences. Uses 5 weighted factors totaling 100%.
 */

import type {
  DiscoveredJob,
  JobSearchPreferencesRow,
  ProfileJobSearchFields,
  MatchResult,
  MatchBreakdown,
  WorkType,
  ExperienceLevel,
  CompanySize,
  SkillRequirement,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface CandidateProfile extends ProfileJobSearchFields {
  id: string
  full_name?: string | null
  skills?: string[]
}

// ============================================================================
// Constants — Weights
// ============================================================================

const WEIGHTS = {
  skills: 0.40,
  experience: 0.20,
  location: 0.15,
  salary: 0.15,
  preferences: 0.10,
} as const

const PASS_THRESHOLD = 75
const BORDERLINE_MIN = 65

// ============================================================================
// Constants — Skill Relationships
// ============================================================================

/**
 * Related skills with similarity percentages.
 * Used for partial matching when exact skill isn't found.
 */
export const SKILL_RELATIONSHIPS: Record<string, Record<string, number>> = {
  // Frontend frameworks
  'react': { 'angular': 0.70, 'vue': 0.70, 'svelte': 0.70, 'next.js': 0.85, 'nextjs': 0.85 },
  'angular': { 'react': 0.70, 'vue': 0.70, 'svelte': 0.70 },
  'vue': { 'react': 0.70, 'angular': 0.70, 'svelte': 0.70, 'nuxt': 0.85 },

  // Languages
  'typescript': { 'javascript': 0.90, 'js': 0.90, 'ts': 1.0 },
  'javascript': { 'typescript': 0.90, 'js': 1.0, 'ts': 0.90 },
  'python': { 'java': 0.50, 'c#': 0.50, 'csharp': 0.50, 'ruby': 0.60 },
  'java': { 'python': 0.50, 'c#': 0.70, 'csharp': 0.70, 'kotlin': 0.85 },
  'c#': { 'java': 0.70, 'python': 0.50, 'csharp': 1.0 },
  'csharp': { 'java': 0.70, 'python': 0.50, 'c#': 1.0 },

  // Cloud providers
  'aws': { 'gcp': 0.70, 'azure': 0.70, 'google cloud': 0.70, 'amazon web services': 1.0 },
  'gcp': { 'aws': 0.70, 'azure': 0.70, 'google cloud': 1.0 },
  'azure': { 'aws': 0.70, 'gcp': 0.70, 'microsoft azure': 1.0 },

  // Databases
  'postgresql': { 'mysql': 0.60, 'mongodb': 0.60, 'postgres': 1.0, 'sql': 0.80 },
  'mysql': { 'postgresql': 0.60, 'mongodb': 0.60, 'postgres': 0.60, 'sql': 0.80 },
  'mongodb': { 'postgresql': 0.60, 'mysql': 0.60, 'nosql': 0.80 },

  // Management skills
  'product management': { 'program management': 0.60, 'project management': 0.70 },
  'program management': { 'product management': 0.60, 'project management': 0.80 },
  'project management': { 'program management': 0.80, 'product management': 0.60 },
  'leadership': { 'management': 0.80, 'team lead': 0.90 },
  'management': { 'leadership': 0.80, 'team lead': 0.70 },

  // DevOps / Infrastructure
  'docker': { 'kubernetes': 0.70, 'k8s': 0.70, 'containerization': 0.90 },
  'kubernetes': { 'docker': 0.70, 'k8s': 1.0, 'containerization': 0.80 },
  'terraform': { 'cloudformation': 0.70, 'pulumi': 0.80, 'infrastructure as code': 0.90 },

  // Data / ML
  'machine learning': { 'deep learning': 0.80, 'ml': 1.0, 'ai': 0.70, 'data science': 0.70 },
  'data science': { 'machine learning': 0.70, 'ml': 0.70, 'analytics': 0.60 },
}

// ============================================================================
// Experience Level Hierarchy
// ============================================================================

const EXPERIENCE_HIERARCHY: ExperienceLevel[] = ['entry', 'mid', 'senior', 'executive']

// ============================================================================
// Skills Score (40%)
// ============================================================================

/**
 * Calculates skills match score (0-100).
 * Full match = 100%, related skill = similarity %, no match = 0%
 */
export function calculateSkillsScore(
  jobSkills: string[],
  candidateSkills: string[] | SkillRequirement[]
): number {
  if (!jobSkills || jobSkills.length === 0) {
    return 70 // Default when job doesn't specify skills
  }

  // Normalize candidate skills to strings
  const normalizedCandidateSkills = candidateSkills.map(skill =>
    typeof skill === 'string' ? skill.toLowerCase().trim() : skill.skill.toLowerCase().trim()
  )

  let totalScore = 0
  const maxScore = jobSkills.length * 100

  for (const jobSkill of jobSkills) {
    const normalizedJobSkill = jobSkill.toLowerCase().trim()

    // Check for exact match
    if (normalizedCandidateSkills.includes(normalizedJobSkill)) {
      totalScore += 100
      continue
    }

    // Check for related skill match
    const relationships = SKILL_RELATIONSHIPS[normalizedJobSkill]
    if (relationships) {
      let bestRelatedMatch = 0
      for (const candidateSkill of normalizedCandidateSkills) {
        const similarity = relationships[candidateSkill]
        if (similarity && similarity > bestRelatedMatch) {
          bestRelatedMatch = similarity
        }
      }
      if (bestRelatedMatch > 0) {
        totalScore += bestRelatedMatch * 100
        continue
      }
    }

    // Check if candidate skill is related to job skill (reverse lookup)
    let reverseMatch = 0
    for (const candidateSkill of normalizedCandidateSkills) {
      const candidateRelations = SKILL_RELATIONSHIPS[candidateSkill]
      if (candidateRelations && candidateRelations[normalizedJobSkill]) {
        reverseMatch = Math.max(reverseMatch, candidateRelations[normalizedJobSkill])
      }
    }
    if (reverseMatch > 0) {
      totalScore += reverseMatch * 100
    }
    // No match = 0 added
  }

  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 70
}

// ============================================================================
// Experience Score (20%)
// ============================================================================

/**
 * Calculates experience level match score (0-100).
 * Exact match = 100%, one level off = 70%, two levels = 30%, more = 0%
 */
export function calculateExperienceScore(
  jobLevel: ExperienceLevel | null | undefined,
  candidateLevel: ExperienceLevel | null | undefined
): number {
  if (!jobLevel || !candidateLevel) {
    return 70 // Default when not specified
  }

  const jobIndex = EXPERIENCE_HIERARCHY.indexOf(jobLevel)
  const candidateIndex = EXPERIENCE_HIERARCHY.indexOf(candidateLevel)

  if (jobIndex === -1 || candidateIndex === -1) {
    return 70 // Unknown level
  }

  const levelDiff = Math.abs(jobIndex - candidateIndex)

  switch (levelDiff) {
    case 0:
      return 100 // Exact match
    case 1:
      return 70 // One level off
    case 2:
      return 30 // Two levels off
    default:
      return 0 // Three+ levels off
  }
}

// ============================================================================
// Location Score (15%)
// ============================================================================

/**
 * Calculates location/remote fit score (0-100).
 * Remote match = 100%, exact city = 100%, same country hybrid = 80%,
 * relocation possible = 50%, incompatible = 0%
 */
export function calculateLocationScore(
  jobLocation: string | null | undefined,
  jobWorkType: WorkType | null | undefined,
  candidatePrefs: {
    city?: string | null
    country?: string | null
    remote_policy?: string | null
    willing_to_relocate?: boolean
  }
): number {
  // If job is fully remote, perfect match for anyone
  if (jobWorkType === 'remote') {
    return 100
  }

  // If job is flexible, nearly perfect
  if (jobWorkType === 'flexible') {
    return 95
  }

  // If candidate wants remote only and job isn't remote
  if (candidatePrefs.remote_policy === 'remote' && jobWorkType !== 'remote') {
    // Check if it's hybrid - might still work
    if (jobWorkType === 'hybrid') {
      return 50
    }
    return 20 // Onsite when candidate wants remote
  }

  if (!jobLocation) {
    return 70 // Default when location not specified
  }

  const normalizedJobLocation = jobLocation.toLowerCase()
  const candidateCity = candidatePrefs.city?.toLowerCase() || ''
  const candidateCountry = candidatePrefs.country?.toLowerCase() || ''

  // Exact city match
  if (candidateCity && normalizedJobLocation.includes(candidateCity)) {
    return 100
  }

  // Same country
  if (candidateCountry && normalizedJobLocation.includes(candidateCountry)) {
    return jobWorkType === 'hybrid' ? 80 : 70
  }

  // Willing to relocate
  if (candidatePrefs.willing_to_relocate) {
    return 50
  }

  // Location mismatch, not willing to relocate
  return 20
}

// ============================================================================
// Salary Score (15%)
// ============================================================================

/**
 * Calculates salary alignment score (0-100).
 * Job salary >= candidate min = 100%, within 10% = 70%, within 20% = 40%, else 0%
 */
export function calculateSalaryScore(
  jobSalaryMin: number | null | undefined,
  jobSalaryMax: number | null | undefined,
  candidateMin: number | null | undefined,
  implicitAdjustment: number = 0
): number {
  // If job doesn't specify salary, default to 70%
  if (jobSalaryMin === null && jobSalaryMax === null) {
    return 70
  }

  // If candidate doesn't have a minimum, always passes
  if (!candidateMin) {
    return 100
  }

  // Apply implicit adjustment (learned from feedback)
  const adjustedCandidateMin = candidateMin * (1 + implicitAdjustment / 100)

  // Use max salary if available, otherwise min
  const jobSalary = jobSalaryMax || jobSalaryMin || 0

  if (jobSalary >= adjustedCandidateMin) {
    return 100
  }

  const deficit = (adjustedCandidateMin - jobSalary) / adjustedCandidateMin

  if (deficit <= 0.10) {
    return 70 // Within 10% below
  }

  if (deficit <= 0.20) {
    return 40 // Within 20% below
  }

  return 0 // More than 20% below
}

// ============================================================================
// Preferences Score (10%)
// ============================================================================

/**
 * Calculates preference alignment score (0-100).
 * Company size +30%, industry +30%, benefits +20%, avoid clear +20%
 */
export function calculatePreferenceScore(
  job: DiscoveredJob,
  prefs: JobSearchPreferencesRow,
  candidateProfile: CandidateProfile
): number {
  let score = 0
  const maxScore = 100

  // Company size match (30%)
  if (job.company_size && prefs.company_size_preferences.length > 0) {
    if (prefs.company_size_preferences.includes(job.company_size)) {
      score += 30
    }
  } else if (prefs.company_size_preferences.length === 0) {
    score += 30 // No preference = neutral
  }

  // Industry match from candidate profile (30%)
  const candidateIndustries = candidateProfile.preferred_industries || []
  if (candidateIndustries.length > 0 && job.description) {
    const jobDescLower = job.description.toLowerCase()
    const industryMatch = candidateIndustries.some(
      ind => jobDescLower.includes(ind.toLowerCase())
    )
    if (industryMatch) {
      score += 30
    }
  } else if (candidateIndustries.length === 0) {
    score += 30 // No preference = neutral
  }

  // Benefits match (20%)
  if (prefs.required_benefits.length > 0 && job.benefits.length > 0) {
    const jobBenefitsLower = job.benefits.map(b => b.toLowerCase())
    const matchedBenefits = prefs.required_benefits.filter(req =>
      jobBenefitsLower.some(jb => jb.includes(req.toLowerCase()))
    )
    const benefitRatio = matchedBenefits.length / prefs.required_benefits.length
    score += Math.round(benefitRatio * 20)
  } else if (prefs.required_benefits.length === 0) {
    score += 20 // No required benefits = neutral
  }

  // Avoid companies clear (10%)
  if (prefs.avoid_companies.length > 0) {
    const companyLower = job.company_name.toLowerCase()
    const isAvoided = prefs.avoid_companies.some(
      avoid => companyLower.includes(avoid.toLowerCase())
    )
    if (!isAvoided) {
      score += 10
    } else {
      score -= 50 // Penalty for avoided company
    }
  } else {
    score += 10
  }

  // Avoid keywords clear (10%)
  if (prefs.avoid_keywords.length > 0 && job.description) {
    const descLower = job.description.toLowerCase()
    const titleLower = job.title.toLowerCase()
    const hasAvoidedKeyword = prefs.avoid_keywords.some(
      kw => descLower.includes(kw.toLowerCase()) || titleLower.includes(kw.toLowerCase())
    )
    if (!hasAvoidedKeyword) {
      score += 10
    } else {
      score -= 30 // Penalty for avoided keyword
    }
  } else {
    score += 10
  }

  return Math.max(0, Math.min(maxScore, score))
}

// ============================================================================
// Match Reasons Generator
// ============================================================================

/**
 * Generates 3-5 human-readable "Why this fits you" reasons.
 */
export function generateMatchReasons(
  job: DiscoveredJob,
  candidateProfile: CandidateProfile,
  breakdown: MatchBreakdown
): string[] {
  const reasons: string[] = []

  // Skills reason
  if (breakdown.skills >= 80) {
    const matchedSkills = job.required_skills.filter(skill => {
      const candidateSkills = candidateProfile.general_cv_analysis?.skills || []
      return candidateSkills.some(cs => cs.toLowerCase() === skill.toLowerCase())
    })
    if (matchedSkills.length > 0) {
      reasons.push(`Your ${matchedSkills.slice(0, 3).join(', ')} skills are a strong match`)
    } else {
      reasons.push('Your technical skills align well with this role')
    }
  } else if (breakdown.skills >= 60) {
    reasons.push('Your skills partially match with room to grow')
  }

  // Experience reason
  if (breakdown.experience >= 90) {
    reasons.push('The experience level is exactly what you are looking for')
  } else if (breakdown.experience >= 70) {
    reasons.push('The seniority level aligns with your career stage')
  }

  // Location reason
  if (breakdown.location >= 90) {
    if (job.work_type === 'remote') {
      reasons.push('Fully remote position matches your flexibility needs')
    } else {
      reasons.push(`Location in ${job.location || 'your area'} is convenient`)
    }
  } else if (job.work_type === 'hybrid') {
    reasons.push('Hybrid work arrangement offers flexibility')
  }

  // Salary reason
  if (breakdown.salary >= 90 && job.salary_min) {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: job.salary_currency || 'USD',
      maximumFractionDigits: 0,
    }).format(job.salary_min)
    reasons.push(`Salary starting at ${formatted} meets your expectations`)
  } else if (breakdown.salary >= 70) {
    reasons.push('Compensation is competitive for this role')
  }

  // Company/industry reason
  if (breakdown.preferences >= 80) {
    if (job.company_size) {
      reasons.push(`Company size (${job.company_size} employees) fits your preference`)
    }
  }

  // Benefits reason
  if (job.benefits.length > 0 && breakdown.preferences >= 60) {
    const topBenefits = job.benefits.slice(0, 2).join(' and ')
    if (topBenefits) {
      reasons.push(`Benefits include ${topBenefits}`)
    }
  }

  // Ensure 3-5 reasons
  if (reasons.length < 3) {
    if (!reasons.some(r => r.includes('remote') || r.includes('location'))) {
      reasons.push('This role offers good work-life balance potential')
    }
    if (!reasons.some(r => r.includes('skills'))) {
      reasons.push('Opportunity to apply and expand your skillset')
    }
    if (!reasons.some(r => r.includes('company'))) {
      reasons.push(`${job.company_name} could be a good career move`)
    }
  }

  return reasons.slice(0, 5)
}

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Calculates comprehensive match score for a job against candidate profile.
 * Returns score breakdown, reasons, and threshold indicators.
 */
export function calculateMatchScore(
  job: DiscoveredJob,
  candidateProfile: CandidateProfile,
  searchPreferences: JobSearchPreferencesRow
): MatchResult {
  // Get candidate skills from CV analysis or profile
  const candidateSkills = candidateProfile.general_cv_analysis?.skills ||
    candidateProfile.skills ||
    searchPreferences.required_skills.map(s => s.skill)

  // Get candidate experience level
  const candidateLevel = (candidateProfile.general_cv_analysis?.seniority_level as ExperienceLevel) || null

  // Get implicit adjustments from learned preferences
  const implicitSalaryAdjustment = (searchPreferences.implicit_preferences as Record<string, number>)?.salary_adjustment || 0

  // Calculate individual scores (0-100 each)
  const skillsScore = calculateSkillsScore(job.required_skills, candidateSkills)
  const experienceScore = calculateExperienceScore(job.experience_level, candidateLevel)
  const locationScore = calculateLocationScore(
    job.location,
    job.work_type,
    {
      city: candidateProfile.location_preferences?.city,
      country: candidateProfile.location_preferences?.country,
      remote_policy: candidateProfile.location_preferences?.remote_policy,
      willing_to_relocate: (candidateProfile.location_preferences as Record<string, boolean>)?.willing_to_relocate,
    }
  )
  const salaryScore = calculateSalaryScore(
    job.salary_min,
    job.salary_max,
    searchPreferences.salary_min_override || candidateProfile.minimum_salary_expectation,
    implicitSalaryAdjustment
  )
  const preferencesScore = calculatePreferenceScore(job, searchPreferences, candidateProfile)

  // Build breakdown
  const breakdown: MatchBreakdown = {
    skills: skillsScore,
    experience: experienceScore,
    location: locationScore,
    salary: salaryScore,
    preferences: preferencesScore,
  }

  // Calculate weighted total score
  const totalScore = Math.round(
    skillsScore * WEIGHTS.skills +
    experienceScore * WEIGHTS.experience +
    locationScore * WEIGHTS.location +
    salaryScore * WEIGHTS.salary +
    preferencesScore * WEIGHTS.preferences
  )

  // Generate match reasons
  const matchReasons = generateMatchReasons(job, candidateProfile, breakdown)

  return {
    totalScore,
    breakdown,
    matchReasons,
    passesThreshold: totalScore >= PASS_THRESHOLD,
    isBorderline: totalScore >= BORDERLINE_MIN && totalScore < PASS_THRESHOLD,
  }
}
