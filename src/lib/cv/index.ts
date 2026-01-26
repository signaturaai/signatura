/**
 * CV Library Exports
 *
 * Provides CV parsing, tailoring, and comparison utilities.
 */

// Parser exports
export {
  parseCVIntoSections,
  assembleCVFromSections,
  normalizeSectionName,
  extractBulletPoints,
  getSectionByName,
  sectionsMatch,
  calculateTextSimilarity,
} from './parser'

export type { CVSection, ParsedCV } from './parser'

// Tailor exports
export {
  generateBestOfBothWorldsCV,
  analyzeInitialCV,
  analyzeATS,
  quickCompare,
} from './tailor'

export type {
  SectionScore,
  SectionComparison,
  TailoringResult,
  CVScore,
  IndicatorScoreEntry,
  InitialAnalysisResult,
  ATSAnalysisDetails,
} from './tailor'

// Landing Page scorer exports
export {
  scoreLandingPage,
  getLandingPageAssessment,
} from './landing-page-scorer'

export type {
  LandingPageMetrics,
  LandingPageDetails,
} from './landing-page-scorer'
