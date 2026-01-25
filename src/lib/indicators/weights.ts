/**
 * Industry Weights System
 *
 * Different industries value indicators differently.
 * This module provides industry-specific weight profiles for scoring.
 *
 * All weights sum to 1.0 for each industry.
 */

import { IndicatorScores, IndustryWeights, SupportedIndustry, INDICATOR_NAMES } from './types'

/**
 * Industry-specific weight profiles
 *
 * Higher weight = more important for that industry
 * All weights sum to 1.0
 */
export const INDUSTRY_WEIGHTS: Record<SupportedIndustry, IndustryWeights> = {
  technology: {
    industry: 'technology',
    displayName: 'Technology / Software',
    description: 'Emphasizes technical skills, problem-solving, and learning agility',
    weights: {
      1: 0.18,  // Job Knowledge (technical expertise) - HIGH
      2: 0.16,  // Problem-Solving - HIGH
      7: 0.12,  // Learning Agility - HIGH (tech changes fast)
      8: 0.11,  // Leadership
      9: 0.10,  // Creativity
      3: 0.09,  // Communication
      6: 0.08,  // Adaptability
      4: 0.07,  // Social Skills
      10: 0.06, // Motivation
      5: 0.03,  // Integrity
    },
  },

  healthcare: {
    industry: 'healthcare',
    displayName: 'Healthcare / Medical',
    description: 'Prioritizes patient care, ethics, and adaptability under pressure',
    weights: {
      4: 0.17,  // Social Skills (patient care, empathy) - HIGH
      5: 0.16,  // Integrity (medical ethics, patient safety) - HIGH
      6: 0.14,  // Adaptability (emergency response, shift work) - HIGH
      1: 0.13,  // Job Knowledge (clinical expertise)
      3: 0.12,  // Communication (patient/family, team)
      2: 0.09,  // Problem-Solving (diagnosis, triage)
      10: 0.07, // Motivation (dedication to care)
      7: 0.05,  // Learning Agility
      8: 0.04,  // Leadership
      9: 0.03,  // Creativity
    },
  },

  education: {
    industry: 'education',
    displayName: 'Education / Teaching',
    description: 'Values communication, creativity, and adaptability with diverse learners',
    weights: {
      3: 0.18,  // Communication (teaching, explaining) - HIGH
      9: 0.14,  // Creativity (engaging lessons) - HIGH
      7: 0.13,  // Learning Agility (staying current) - HIGH
      4: 0.13,  // Social Skills (student relationships)
      6: 0.12,  // Adaptability (diverse learners, curriculum changes)
      8: 0.10,  // Leadership (classroom management)
      1: 0.08,  // Job Knowledge (subject expertise)
      5: 0.05,  // Integrity
      2: 0.04,  // Problem-Solving
      10: 0.03, // Motivation
    },
  },

  retail: {
    industry: 'retail',
    displayName: 'Retail / Customer Service',
    description: 'Emphasizes customer relationships, leadership, and drive',
    weights: {
      4: 0.19,  // Social Skills (customer service) - HIGH
      10: 0.16, // Motivation (sales drive, performance) - HIGH
      8: 0.14,  // Leadership (team management) - HIGH
      6: 0.13,  // Adaptability (fast-paced, seasonal)
      3: 0.11,  // Communication
      2: 0.09,  // Problem-Solving (customer issues)
      1: 0.07,  // Job Knowledge (products, systems)
      5: 0.05,  // Integrity
      7: 0.04,  // Learning Agility
      9: 0.02,  // Creativity
    },
  },

  finance: {
    industry: 'finance',
    displayName: 'Finance / Banking',
    description: 'Prioritizes integrity, analytical skills, and professional knowledge',
    weights: {
      5: 0.18,  // Integrity (fiduciary duty, compliance) - HIGH
      2: 0.17,  // Problem-Solving (financial analysis) - HIGH
      1: 0.16,  // Job Knowledge (financial expertise) - HIGH
      3: 0.12,  // Communication (client advisory)
      6: 0.10,  // Adaptability (market changes, regulations)
      7: 0.08,  // Learning Agility (new regulations, products)
      4: 0.07,  // Social Skills (client relationships)
      8: 0.06,  // Leadership
      10: 0.04, // Motivation
      9: 0.02,  // Creativity
    },
  },

  manufacturing: {
    industry: 'manufacturing',
    displayName: 'Manufacturing / Production',
    description: 'Values technical skills, problem-solving, and adaptability',
    weights: {
      1: 0.18,  // Job Knowledge (technical/mechanical expertise) - HIGH
      2: 0.16,  // Problem-Solving (troubleshooting) - HIGH
      6: 0.14,  // Adaptability (shift work, equipment changes)
      5: 0.12,  // Integrity (safety, quality)
      4: 0.10,  // Social Skills (team work)
      8: 0.09,  // Leadership
      10: 0.08, // Motivation (reliability)
      3: 0.06,  // Communication
      7: 0.05,  // Learning Agility
      9: 0.02,  // Creativity
    },
  },

  hospitality: {
    industry: 'hospitality',
    displayName: 'Hospitality / Food Service',
    description: 'Emphasizes customer service, adaptability, and teamwork',
    weights: {
      4: 0.20,  // Social Skills (guest service) - HIGHEST
      6: 0.16,  // Adaptability (fast-paced, demanding guests) - HIGH
      3: 0.14,  // Communication (guests, team) - HIGH
      10: 0.12, // Motivation (service excellence)
      8: 0.10,  // Leadership (team coordination)
      2: 0.08,  // Problem-Solving (guest issues)
      1: 0.07,  // Job Knowledge
      5: 0.06,  // Integrity
      7: 0.04,  // Learning Agility
      9: 0.03,  // Creativity
    },
  },

  nonprofit: {
    industry: 'nonprofit',
    displayName: 'Nonprofit / Social Services',
    description: 'Values integrity, communication, and mission-driven motivation',
    weights: {
      5: 0.16,  // Integrity (mission alignment, ethics) - HIGH
      10: 0.15, // Motivation (passion for cause) - HIGH
      3: 0.14,  // Communication (stakeholders, donors) - HIGH
      4: 0.13,  // Social Skills (community engagement)
      6: 0.11,  // Adaptability (resource constraints)
      8: 0.10,  // Leadership
      2: 0.08,  // Problem-Solving
      9: 0.06,  // Creativity (doing more with less)
      1: 0.04,  // Job Knowledge
      7: 0.03,  // Learning Agility
    },
  },

  government: {
    industry: 'government',
    displayName: 'Government / Public Sector',
    description: 'Prioritizes integrity, communication, and process adherence',
    weights: {
      5: 0.18,  // Integrity (public trust, ethics) - HIGH
      3: 0.15,  // Communication (public, stakeholders) - HIGH
      1: 0.14,  // Job Knowledge (regulations, procedures) - HIGH
      6: 0.12,  // Adaptability (policy changes)
      4: 0.11,  // Social Skills
      2: 0.10,  // Problem-Solving
      8: 0.08,  // Leadership
      10: 0.06, // Motivation
      7: 0.04,  // Learning Agility
      9: 0.02,  // Creativity
    },
  },

  generic: {
    industry: 'generic',
    displayName: 'General / Unknown',
    description: 'All indicators weighted equally for fair assessment',
    weights: {
      1: 0.10,
      2: 0.10,
      3: 0.10,
      4: 0.10,
      5: 0.10,
      6: 0.10,
      7: 0.10,
      8: 0.10,
      9: 0.10,
      10: 0.10,
    },
  },
}

/**
 * Get weight profile for an industry
 * Falls back to generic if industry not recognized
 */
export function getIndustryWeights(industry: string): IndustryWeights {
  const normalized = industry.toLowerCase().trim()

  // Check for exact match
  if (normalized in INDUSTRY_WEIGHTS) {
    return INDUSTRY_WEIGHTS[normalized as SupportedIndustry]
  }

  // Check for partial matches
  const industryMap: Record<string, SupportedIndustry> = {
    // Technology variations
    'tech': 'technology',
    'software': 'technology',
    'it': 'technology',
    'engineering': 'technology',
    'developer': 'technology',
    'programming': 'technology',

    // Healthcare variations
    'medical': 'healthcare',
    'nursing': 'healthcare',
    'hospital': 'healthcare',
    'clinical': 'healthcare',
    'health': 'healthcare',
    'pharmaceutical': 'healthcare',

    // Education variations
    'teaching': 'education',
    'academic': 'education',
    'school': 'education',
    'university': 'education',
    'training': 'education',

    // Retail variations
    'sales': 'retail',
    'store': 'retail',
    'customer service': 'retail',
    'commerce': 'retail',
    'ecommerce': 'retail',

    // Finance variations
    'banking': 'finance',
    'financial': 'finance',
    'accounting': 'finance',
    'investment': 'finance',
    'insurance': 'finance',

    // Manufacturing variations
    'production': 'manufacturing',
    'factory': 'manufacturing',
    'industrial': 'manufacturing',
    'construction': 'manufacturing',

    // Hospitality variations
    'hotel': 'hospitality',
    'restaurant': 'hospitality',
    'food service': 'hospitality',
    'tourism': 'hospitality',
    'travel': 'hospitality',

    // Nonprofit variations
    'ngo': 'nonprofit',
    'charity': 'nonprofit',
    'social work': 'nonprofit',
    'community': 'nonprofit',

    // Government variations
    'public sector': 'government',
    'federal': 'government',
    'state': 'government',
    'municipal': 'government',
    'civil service': 'government',
  }

  for (const [keyword, mappedIndustry] of Object.entries(industryMap)) {
    if (normalized.includes(keyword)) {
      return INDUSTRY_WEIGHTS[mappedIndustry]
    }
  }

  // Default to generic
  return INDUSTRY_WEIGHTS.generic
}

/**
 * Calculate weighted overall score based on industry
 */
export function calculateWeightedScore(
  scores: IndicatorScores,
  industry: string
): number {
  const weights = getIndustryWeights(industry)
  let weightedSum = 0
  let totalWeight = 0

  for (const [numStr, score] of Object.entries(scores.scores)) {
    const num = parseInt(numStr)
    const weight = weights.weights[num] || 0.1
    weightedSum += score.score * weight
    totalWeight += weight
  }

  // Normalize if not all indicators present
  const result = totalWeight > 0 ? weightedSum / totalWeight : 0
  return Math.round(result * 10) / 10
}

/**
 * Get top indicators for an industry (most important)
 */
export function getTopIndicators(industry: string, count: number = 3): number[] {
  const weights = getIndustryWeights(industry)

  return Object.entries(weights.weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([num]) => parseInt(num))
}

/**
 * Get indicator importance description for industry
 */
export function getIndicatorImportance(
  indicatorNumber: number,
  industry: string
): 'critical' | 'important' | 'moderate' | 'supplementary' {
  const weights = getIndustryWeights(industry)
  const weight = weights.weights[indicatorNumber] || 0.1

  if (weight >= 0.15) return 'critical'
  if (weight >= 0.10) return 'important'
  if (weight >= 0.06) return 'moderate'
  return 'supplementary'
}

/**
 * Format weights for display
 */
export function formatWeightsForDisplay(industry: string): Array<{
  indicatorNumber: number
  indicatorName: string
  weight: number
  percentage: string
  importance: string
}> {
  const weights = getIndustryWeights(industry)

  return Object.entries(weights.weights)
    .map(([numStr, weight]) => {
      const num = parseInt(numStr)
      return {
        indicatorNumber: num,
        indicatorName: INDICATOR_NAMES[num],
        weight,
        percentage: `${Math.round(weight * 100)}%`,
        importance: getIndicatorImportance(num, industry),
      }
    })
    .sort((a, b) => b.weight - a.weight)
}

/**
 * Get all supported industries
 */
export function getSupportedIndustries(): Array<{
  id: SupportedIndustry
  displayName: string
  description: string
}> {
  return Object.entries(INDUSTRY_WEIGHTS).map(([id, profile]) => ({
    id: id as SupportedIndustry,
    displayName: profile.displayName,
    description: profile.description,
  }))
}
