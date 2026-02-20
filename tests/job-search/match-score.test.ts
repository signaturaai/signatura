/**
 * Job Match Scoring Tests (Phase 3.2)
 *
 * RALPH tests for the multi-factor job matching algorithm.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSkillsScore,
  calculateExperienceScore,
  calculateLocationScore,
  calculateSalaryScore,
  calculatePreferenceScore,
  calculateMatchScore,
  generateMatchReasons,
  SKILL_RELATIONSHIPS,
} from '@/lib/job-search/match-score'
import type {
  DiscoveredJob,
  JobSearchPreferencesRow,
  ProfileJobSearchFields,
  ExperienceLevel,
} from '@/types/job-search'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockJob(overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  return {
    title: 'Senior Software Engineer',
    company_name: 'TechCorp',
    source_url: 'https://techcorp.com/jobs/123',
    required_skills: ['TypeScript', 'React', 'Node.js'],
    benefits: ['Health Insurance', '401k', 'Remote Work'],
    location: 'San Francisco, CA',
    work_type: 'hybrid',
    experience_level: 'senior',
    salary_min: 150000,
    salary_max: 200000,
    salary_currency: 'USD',
    company_size: '201-500',
    ...overrides,
  }
}

function createMockProfile(overrides: Partial<ProfileJobSearchFields & { id: string; skills?: string[] }> = {}) {
  return {
    id: 'user-123',
    preferred_job_titles: ['Software Engineer'],
    preferred_industries: ['Fintech', 'SaaS'],
    minimum_salary_expectation: 140000,
    salary_currency: 'USD',
    location_preferences: { city: 'San Francisco', country: 'USA', remote_policy: 'hybrid' },
    company_size_preferences: ['201-500'] as const,
    career_goals: 'Become a tech lead',
    general_cv_analysis: {
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
      experience_years: 6,
      industries: ['Fintech'],
      seniority_level: 'senior',
    },
    skills: ['TypeScript', 'React'],
    ...overrides,
  }
}

function createMockPreferences(overrides: Partial<JobSearchPreferencesRow> = {}): JobSearchPreferencesRow {
  return {
    id: 'prefs-123',
    user_id: 'user-123',
    is_active: true,
    preferred_job_titles: [],
    preferred_locations: [],
    experience_years: null,
    required_skills: [],
    company_size_preferences: ['201-500'],
    remote_policy_preferences: ['hybrid', 'remote'],
    required_benefits: ['Health Insurance'],
    salary_min_override: null,
    salary_currency_override: null,
    avoid_companies: [],
    avoid_keywords: [],
    ai_keywords: [],
    ai_recommended_boards: [],
    ai_market_insights: null,
    ai_personalized_strategy: null,
    ai_last_analysis_at: null,
    implicit_preferences: {},
    feedback_stats: { total_likes: 0, total_dislikes: 0, total_hides: 0, reasons: {} },
    email_notification_frequency: 'weekly',
    last_email_sent_at: null,
    last_search_at: null,
    consecutive_zero_match_days: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// SKILL_RELATIONSHIPS Tests
// ============================================================================

describe('SKILL_RELATIONSHIPS', () => {
  it('R: is exported as a constant object', () => {
    expect(typeof SKILL_RELATIONSHIPS).toBe('object')
    expect(SKILL_RELATIONSHIPS).not.toBeNull()
  })

  it('A: contains TypeScript ↔ JavaScript relationship at 90%', () => {
    expect(SKILL_RELATIONSHIPS['typescript']['javascript']).toBe(0.90)
    expect(SKILL_RELATIONSHIPS['javascript']['typescript']).toBe(0.90)
  })

  it('A: contains React ↔ Angular ↔ Vue relationships at 70%', () => {
    expect(SKILL_RELATIONSHIPS['react']['angular']).toBe(0.70)
    expect(SKILL_RELATIONSHIPS['react']['vue']).toBe(0.70)
    expect(SKILL_RELATIONSHIPS['angular']['vue']).toBe(0.70)
  })

  it('A: contains AWS ↔ GCP ↔ Azure relationships at 70%', () => {
    expect(SKILL_RELATIONSHIPS['aws']['gcp']).toBe(0.70)
    expect(SKILL_RELATIONSHIPS['aws']['azure']).toBe(0.70)
    expect(SKILL_RELATIONSHIPS['gcp']['azure']).toBe(0.70)
  })

  it('A: contains Leadership ↔ Management relationship at 80%', () => {
    expect(SKILL_RELATIONSHIPS['leadership']['management']).toBe(0.80)
    expect(SKILL_RELATIONSHIPS['management']['leadership']).toBe(0.80)
  })

  it('A: contains PostgreSQL ↔ MySQL ↔ MongoDB relationships at 60%', () => {
    expect(SKILL_RELATIONSHIPS['postgresql']['mysql']).toBe(0.60)
    expect(SKILL_RELATIONSHIPS['postgresql']['mongodb']).toBe(0.60)
  })

  it('A: contains Product Management ↔ Program Management at 60%', () => {
    expect(SKILL_RELATIONSHIPS['product management']['program management']).toBe(0.60)
  })
})

// ============================================================================
// calculateSkillsScore Tests (40% weight)
// ============================================================================

describe('calculateSkillsScore', () => {
  // --- Returns ---

  it('R: returns 100 for perfect skill match', () => {
    const jobSkills = ['TypeScript', 'React', 'Node.js']
    const candidateSkills = ['TypeScript', 'React', 'Node.js']
    const score = calculateSkillsScore(jobSkills, candidateSkills)
    expect(score).toBe(100)
  })

  it('R: returns 0-100 range score', () => {
    const score = calculateSkillsScore(['Python', 'Java'], ['JavaScript', 'Go'])
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  // --- Asserts: Exact matching ---

  it('A: exact skill match is case-insensitive', () => {
    const score = calculateSkillsScore(['TYPESCRIPT', 'REACT'], ['typescript', 'react'])
    expect(score).toBe(100)
  })

  it('A: handles whitespace in skill names', () => {
    const score = calculateSkillsScore([' TypeScript ', ' React '], ['TypeScript', 'React'])
    expect(score).toBe(100)
  })

  // --- Asserts: Related skill matching ---

  it('A: gives 90% credit for TypeScript when job requires JavaScript', () => {
    const score = calculateSkillsScore(['JavaScript'], ['TypeScript'])
    expect(score).toBe(90)
  })

  it('A: gives 70% credit for React when job requires Angular', () => {
    const score = calculateSkillsScore(['Angular'], ['React'])
    expect(score).toBe(70)
  })

  it('A: gives 70% credit for AWS when job requires GCP', () => {
    const score = calculateSkillsScore(['GCP'], ['AWS'])
    expect(score).toBe(70)
  })

  it('A: handles SkillRequirement objects', () => {
    const jobSkills = ['TypeScript', 'React']
    const candidateSkills = [
      { skill: 'TypeScript', proficiency: 'expert' as const },
      { skill: 'React', proficiency: 'intermediate' as const },
    ]
    const score = calculateSkillsScore(jobSkills, candidateSkills)
    expect(score).toBe(100)
  })

  // --- Logic ---

  it('L: returns 70% default when job has no required skills', () => {
    const score = calculateSkillsScore([], ['TypeScript', 'React'])
    expect(score).toBe(70)
  })

  it('L: partial match scores proportionally', () => {
    // 2 out of 4 skills = 50%
    const score = calculateSkillsScore(
      ['TypeScript', 'React', 'Python', 'Go'],
      ['TypeScript', 'React']
    )
    expect(score).toBe(50)
  })

  it('L: reverse lookup works (candidate has related skill)', () => {
    // Candidate has PostgreSQL, job wants MySQL (60% related)
    const score = calculateSkillsScore(['MySQL'], ['PostgreSQL'])
    expect(score).toBe(60)
  })

  // --- Handling ---

  it('H: handles empty candidate skills', () => {
    const score = calculateSkillsScore(['TypeScript', 'React'], [])
    expect(score).toBe(0)
  })

  it('H: handles null-ish values gracefully', () => {
    const score = calculateSkillsScore(null as unknown as string[], ['TypeScript'])
    expect(score).toBe(70) // Default
  })
})

// ============================================================================
// calculateExperienceScore Tests (20% weight)
// ============================================================================

describe('calculateExperienceScore', () => {
  // --- Returns ---

  it('R: returns 100 for exact level match', () => {
    expect(calculateExperienceScore('senior', 'senior')).toBe(100)
    expect(calculateExperienceScore('mid', 'mid')).toBe(100)
  })

  it('R: returns 70 for one level difference', () => {
    expect(calculateExperienceScore('senior', 'mid')).toBe(70)
    expect(calculateExperienceScore('mid', 'senior')).toBe(70)
    expect(calculateExperienceScore('entry', 'mid')).toBe(70)
  })

  it('R: returns 30 for two level difference', () => {
    expect(calculateExperienceScore('senior', 'entry')).toBe(30)
    expect(calculateExperienceScore('executive', 'mid')).toBe(30)
  })

  it('R: returns 0 for three+ level difference', () => {
    expect(calculateExperienceScore('executive', 'entry')).toBe(0)
  })

  // --- Asserts ---

  it('A: hierarchy is entry < mid < senior < executive', () => {
    // Moving up the hierarchy
    expect(calculateExperienceScore('mid', 'entry')).toBe(70)
    expect(calculateExperienceScore('senior', 'mid')).toBe(70)
    expect(calculateExperienceScore('executive', 'senior')).toBe(70)
  })

  // --- Logic ---

  it('L: returns 70% default when job level not specified', () => {
    expect(calculateExperienceScore(null, 'senior')).toBe(70)
    expect(calculateExperienceScore(undefined, 'mid')).toBe(70)
  })

  it('L: returns 70% default when candidate level not specified', () => {
    expect(calculateExperienceScore('senior', null)).toBe(70)
    expect(calculateExperienceScore('mid', undefined)).toBe(70)
  })

  // --- Handling ---

  it('H: handles unknown level strings', () => {
    expect(calculateExperienceScore('junior' as ExperienceLevel, 'senior')).toBe(70)
    expect(calculateExperienceScore('senior', 'principal' as ExperienceLevel)).toBe(70)
  })
})

// ============================================================================
// calculateLocationScore Tests (15% weight)
// ============================================================================

describe('calculateLocationScore', () => {
  // --- Returns: Remote ---

  it('R: returns 100 for fully remote job', () => {
    const score = calculateLocationScore('Anywhere', 'remote', { city: 'Austin' })
    expect(score).toBe(100)
  })

  it('R: returns 95 for flexible work type', () => {
    const score = calculateLocationScore('New York', 'flexible', { city: 'Austin' })
    expect(score).toBe(95)
  })

  // --- Returns: Location Match ---

  it('R: returns 100 for exact city match', () => {
    const score = calculateLocationScore('San Francisco, CA', 'hybrid', { city: 'San Francisco' })
    expect(score).toBe(100)
  })

  it('R: returns 80 for same country hybrid', () => {
    const score = calculateLocationScore('New York, USA', 'hybrid', { city: 'Austin', country: 'USA' })
    expect(score).toBe(80)
  })

  // --- Asserts: Remote preference ---

  it('A: returns 50 for hybrid when candidate wants remote-only', () => {
    const score = calculateLocationScore('New York', 'hybrid', { remote_policy: 'remote' })
    expect(score).toBe(50)
  })

  it('A: returns 20 for onsite when candidate wants remote', () => {
    const score = calculateLocationScore('New York', 'onsite', { remote_policy: 'remote' })
    expect(score).toBe(20)
  })

  // --- Logic ---

  it('L: returns 70% when job location not specified', () => {
    const score = calculateLocationScore(null, 'onsite', { city: 'Austin' })
    expect(score).toBe(70)
  })

  it('L: returns 50 for relocation-willing candidate', () => {
    const score = calculateLocationScore('London, UK', 'onsite', {
      city: 'Austin',
      country: 'USA',
      willing_to_relocate: true,
    })
    expect(score).toBe(50)
  })

  it('L: returns 20 for location mismatch without relocation willingness', () => {
    const score = calculateLocationScore('London, UK', 'onsite', {
      city: 'Austin',
      country: 'USA',
      willing_to_relocate: false,
    })
    expect(score).toBe(20)
  })

  // --- Handling ---

  it('H: handles empty candidate preferences', () => {
    const score = calculateLocationScore('San Francisco', 'onsite', {})
    expect(score).toBe(20) // No match possible
  })

  it('H: location matching is case-insensitive', () => {
    const score = calculateLocationScore('SAN FRANCISCO, CA', 'hybrid', { city: 'san francisco' })
    expect(score).toBe(100)
  })
})

// ============================================================================
// calculateSalaryScore Tests (15% weight)
// ============================================================================

describe('calculateSalaryScore', () => {
  // --- Returns ---

  it('R: returns 100 when job salary >= candidate minimum', () => {
    expect(calculateSalaryScore(150000, 200000, 140000)).toBe(100)
    expect(calculateSalaryScore(150000, null, 150000)).toBe(100)
  })

  it('R: returns 70 when within 10% below minimum', () => {
    // 135k is 96.4% of 140k (3.6% below)
    expect(calculateSalaryScore(135000, null, 140000)).toBe(70)
  })

  it('R: returns 40 when within 20% below minimum', () => {
    // 120k is 85.7% of 140k (14.3% below)
    expect(calculateSalaryScore(120000, null, 140000)).toBe(40)
  })

  it('R: returns 0 when more than 20% below minimum', () => {
    // 100k is 71.4% of 140k (28.6% below)
    expect(calculateSalaryScore(100000, null, 140000)).toBe(0)
  })

  // --- Asserts ---

  it('A: uses max salary if both min and max provided', () => {
    // Max of 160k >= 140k
    expect(calculateSalaryScore(130000, 160000, 140000)).toBe(100)
  })

  it('A: applies implicit adjustment correctly', () => {
    // 140k with +10% adjustment = 154k minimum
    // 150k / 154k = 97.4% (2.6% below) → 70
    expect(calculateSalaryScore(150000, null, 140000, 10)).toBe(70)
  })

  // --- Logic ---

  it('L: returns 70% default when salary not specified', () => {
    expect(calculateSalaryScore(null, null, 140000)).toBe(70)
  })

  it('L: returns 100 when candidate has no minimum', () => {
    expect(calculateSalaryScore(50000, null, null)).toBe(100)
    expect(calculateSalaryScore(50000, null, 0)).toBe(100)
  })

  // --- Handling ---

  it('H: handles edge case of exactly 10% below', () => {
    // 126k is exactly 90% of 140k (10% below)
    expect(calculateSalaryScore(126000, null, 140000)).toBe(70)
  })

  it('H: handles edge case of exactly 20% below', () => {
    // 112k is exactly 80% of 140k (20% below)
    expect(calculateSalaryScore(112000, null, 140000)).toBe(40)
  })
})

// ============================================================================
// calculatePreferenceScore Tests (10% weight)
// ============================================================================

describe('calculatePreferenceScore', () => {
  // --- Returns ---

  it('R: returns 100 for full preference match', () => {
    const job = createMockJob({
      company_size: '201-500',
      description: 'Fintech startup revolutionizing payments',
      benefits: ['Health Insurance', '401k'],
    })
    const prefs = createMockPreferences({
      company_size_preferences: ['201-500'],
      required_benefits: ['Health Insurance'],
      avoid_companies: [],
      avoid_keywords: [],
    })
    const profile = createMockProfile()
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBe(100)
  })

  // --- Asserts: Company size ---

  it('A: awards 30 points for company size match', () => {
    const job = createMockJob({ company_size: '51-200' })
    const prefs = createMockPreferences({
      company_size_preferences: ['51-200'],
      required_benefits: [],
      avoid_companies: [],
      avoid_keywords: [],
    })
    const profile = createMockProfile({ preferred_industries: [] })
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeGreaterThanOrEqual(50) // 30 (size) + 30 (no industry pref) - something
  })

  // --- Asserts: Industry ---

  it('A: awards 30 points for industry match in description', () => {
    const job = createMockJob({ description: 'Leading Fintech company' })
    const prefs = createMockPreferences({
      company_size_preferences: [],
      required_benefits: [],
    })
    const profile = createMockProfile({ preferred_industries: ['Fintech'] })
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  // --- Asserts: Benefits ---

  it('A: awards up to 20 points for benefits match', () => {
    const job = createMockJob({ benefits: ['Health Insurance', '401k', 'Remote Work'] })
    const prefs = createMockPreferences({
      required_benefits: ['Health Insurance', '401k'],
      company_size_preferences: [],
    })
    const profile = createMockProfile({ preferred_industries: [] })
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  // --- Logic: Avoid lists ---

  it('L: penalizes avoided company', () => {
    const job = createMockJob({ company_name: 'BadCorp Inc' })
    const prefs = createMockPreferences({ avoid_companies: ['BadCorp'] })
    const profile = createMockProfile()
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeLessThan(60)
  })

  it('L: penalizes avoided keyword in description', () => {
    const job = createMockJob({ description: 'Entry-level unpaid internship' })
    const prefs = createMockPreferences({ avoid_keywords: ['unpaid'] })
    const profile = createMockProfile()
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeLessThan(80)
  })

  it('L: penalizes avoided keyword in title', () => {
    const job = createMockJob({ title: 'Unpaid Marketing Intern' })
    const prefs = createMockPreferences({ avoid_keywords: ['Unpaid'] })
    const profile = createMockProfile()
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeLessThan(80)
  })

  // --- Handling ---

  it('H: handles empty preferences neutrally', () => {
    const job = createMockJob()
    const prefs = createMockPreferences({
      company_size_preferences: [],
      required_benefits: [],
      avoid_companies: [],
      avoid_keywords: [],
    })
    const profile = createMockProfile({ preferred_industries: [] })
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBe(100) // All neutral bonuses
  })

  it('H: score never exceeds 100', () => {
    const job = createMockJob()
    const prefs = createMockPreferences()
    const profile = createMockProfile()
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('H: score never goes below 0', () => {
    const job = createMockJob({
      company_name: 'AvoidedCorp',
      title: 'Bad Position',
      description: 'Contains bad keyword',
    })
    const prefs = createMockPreferences({
      avoid_companies: ['AvoidedCorp'],
      avoid_keywords: ['bad'],
    })
    const profile = createMockProfile()
    const score = calculatePreferenceScore(job, prefs, profile)
    expect(score).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================================
// generateMatchReasons Tests
// ============================================================================

describe('generateMatchReasons', () => {
  // --- Returns ---

  it('R: returns an array of 3-5 strings', () => {
    const job = createMockJob()
    const profile = createMockProfile()
    const breakdown = { skills: 90, experience: 100, location: 100, salary: 100, preferences: 80 }
    const reasons = generateMatchReasons(job, profile, breakdown)
    expect(Array.isArray(reasons)).toBe(true)
    expect(reasons.length).toBeGreaterThanOrEqual(3)
    expect(reasons.length).toBeLessThanOrEqual(5)
    reasons.forEach(r => expect(typeof r).toBe('string'))
  })

  // --- Asserts: Content based on scores ---

  it('A: mentions matched skills when skills score >= 80', () => {
    const job = createMockJob({ required_skills: ['TypeScript', 'React'] })
    const profile = createMockProfile()
    const breakdown = { skills: 90, experience: 70, location: 70, salary: 70, preferences: 70 }
    const reasons = generateMatchReasons(job, profile, breakdown)
    const hasSkillReason = reasons.some(r => r.toLowerCase().includes('skill'))
    expect(hasSkillReason).toBe(true)
  })

  it('A: mentions remote when location score high and job is remote', () => {
    const job = createMockJob({ work_type: 'remote' })
    const profile = createMockProfile()
    const breakdown = { skills: 70, experience: 70, location: 100, salary: 70, preferences: 70 }
    const reasons = generateMatchReasons(job, profile, breakdown)
    const hasRemoteReason = reasons.some(r => r.toLowerCase().includes('remote'))
    expect(hasRemoteReason).toBe(true)
  })

  it('A: mentions salary when salary score >= 90 and salary provided', () => {
    const job = createMockJob({ salary_min: 150000 })
    const profile = createMockProfile()
    const breakdown = { skills: 70, experience: 70, location: 70, salary: 100, preferences: 70 }
    const reasons = generateMatchReasons(job, profile, breakdown)
    const hasSalaryReason = reasons.some(r => r.toLowerCase().includes('salary') || r.includes('$'))
    expect(hasSalaryReason).toBe(true)
  })

  it('A: mentions experience level match', () => {
    const job = createMockJob()
    const profile = createMockProfile()
    const breakdown = { skills: 70, experience: 100, location: 70, salary: 70, preferences: 70 }
    const reasons = generateMatchReasons(job, profile, breakdown)
    const hasExpReason = reasons.some(r =>
      r.toLowerCase().includes('experience') ||
      r.toLowerCase().includes('seniority') ||
      r.toLowerCase().includes('career')
    )
    expect(hasExpReason).toBe(true)
  })

  // --- Handling ---

  it('H: always returns at least 3 reasons even for low scores', () => {
    const job = createMockJob()
    const profile = createMockProfile()
    const breakdown = { skills: 30, experience: 30, location: 30, salary: 30, preferences: 30 }
    const reasons = generateMatchReasons(job, profile, breakdown)
    expect(reasons.length).toBeGreaterThanOrEqual(3)
  })
})

// ============================================================================
// calculateMatchScore (Main Function) Tests
// ============================================================================

describe('calculateMatchScore', () => {
  // --- Returns: Structure ---

  it('R: returns MatchResult with all required fields', () => {
    const job = createMockJob()
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    expect(result).toHaveProperty('totalScore')
    expect(result).toHaveProperty('breakdown')
    expect(result).toHaveProperty('matchReasons')
    expect(result).toHaveProperty('passesThreshold')
    expect(result).toHaveProperty('isBorderline')

    expect(result.breakdown).toHaveProperty('skills')
    expect(result.breakdown).toHaveProperty('experience')
    expect(result.breakdown).toHaveProperty('location')
    expect(result.breakdown).toHaveProperty('salary')
    expect(result.breakdown).toHaveProperty('preferences')
  })

  it('R: totalScore is a number between 0 and 100', () => {
    const job = createMockJob()
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    expect(typeof result.totalScore).toBe('number')
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.totalScore).toBeLessThanOrEqual(100)
  })

  // --- Asserts: Thresholds ---

  it('A: passesThreshold is true when score >= 75', () => {
    const job = createMockJob()
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    if (result.totalScore >= 75) {
      expect(result.passesThreshold).toBe(true)
      expect(result.isBorderline).toBe(false)
    }
  })

  it('A: isBorderline is true when score is 65-74', () => {
    // Create a borderline match
    const job = createMockJob({
      required_skills: ['Python', 'Django', 'PostgreSQL'], // Different skills
      experience_level: 'mid', // One level off
    })
    const profile = createMockProfile({
      general_cv_analysis: {
        skills: ['JavaScript', 'React'], // No Python
        experience_years: 6,
        industries: [],
        seniority_level: 'senior',
      },
    })
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    if (result.totalScore >= 65 && result.totalScore < 75) {
      expect(result.isBorderline).toBe(true)
      expect(result.passesThreshold).toBe(false)
    }
  })

  // --- Logic: Weighting ---

  it('L: skills have 40% weight (highest impact)', () => {
    // Perfect match except skills = 0
    const job = createMockJob({ required_skills: ['Cobol', 'Fortran', 'Assembly'] })
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    // Skills = 0, others high → total should be around 60% of max
    expect(result.breakdown.skills).toBe(0)
    expect(result.totalScore).toBeLessThan(70)
  })

  it('L: uses salary_min_override from preferences when set', () => {
    const job = createMockJob({ salary_min: 100000, salary_max: 120000 })
    const profile = createMockProfile({ minimum_salary_expectation: 80000 })
    const prefs = createMockPreferences({ salary_min_override: 150000 })
    const result = calculateMatchScore(job, profile, prefs)

    // Salary should be low because override (150k) > job max (120k)
    expect(result.breakdown.salary).toBeLessThan(70)
  })

  it('L: uses implicit_preferences for salary adjustment', () => {
    const job = createMockJob({ salary_min: 145000, salary_max: 160000 })
    const profile = createMockProfile({ minimum_salary_expectation: 140000 })
    const prefs = createMockPreferences({
      implicit_preferences: { salary_adjustment: 10 }, // +10% = 154k minimum
    })
    const result = calculateMatchScore(job, profile, prefs)

    // 160k > 154k adjusted minimum → should pass
    expect(result.breakdown.salary).toBe(100)
  })

  // --- Handling: Missing data ---

  it('H: handles job with minimal data', () => {
    const job: DiscoveredJob = {
      title: 'Software Engineer',
      company_name: 'Corp',
      source_url: 'https://corp.com/job',
      required_skills: [],
      benefits: [],
    }
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.matchReasons.length).toBeGreaterThanOrEqual(3)
  })

  it('H: handles profile with minimal data', () => {
    const job = createMockJob()
    const profile = {
      id: 'user-123',
      preferred_job_titles: [],
      preferred_industries: [],
      minimum_salary_expectation: null,
      salary_currency: 'USD',
      location_preferences: {},
      company_size_preferences: [],
      career_goals: null,
      general_cv_analysis: null,
    }
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    expect(result.totalScore).toBeGreaterThanOrEqual(0)
  })

  // --- Integration ---

  it('I: high-quality match scores 80+', () => {
    const job = createMockJob({
      required_skills: ['TypeScript', 'React', 'Node.js'],
      experience_level: 'senior',
      work_type: 'remote',
      salary_min: 150000,
      salary_max: 200000,
      company_size: '201-500',
      benefits: ['Health Insurance', '401k'],
    })
    const profile = createMockProfile()
    const prefs = createMockPreferences()
    const result = calculateMatchScore(job, profile, prefs)

    expect(result.totalScore).toBeGreaterThanOrEqual(80)
    expect(result.passesThreshold).toBe(true)
  })

  it('I: poor match scores below 50', () => {
    const job = createMockJob({
      required_skills: ['Cobol', 'Mainframe', 'CICS'],
      experience_level: 'entry',
      work_type: 'onsite',
      location: 'Tokyo, Japan',
      salary_min: 50000,
      salary_max: 60000,
      company_size: '1-10',
    })
    const profile = createMockProfile({
      location_preferences: { city: 'San Francisco', country: 'USA', remote_policy: 'remote' },
    })
    const prefs = createMockPreferences({
      avoid_keywords: ['Mainframe'],
    })
    const result = calculateMatchScore(job, profile, prefs)

    expect(result.totalScore).toBeLessThan(50)
    expect(result.passesThreshold).toBe(false)
  })
})
