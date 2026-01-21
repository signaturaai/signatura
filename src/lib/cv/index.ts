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
  quickCompare,
} from './tailor'

export type {
  SectionScore,
  SectionComparison,
  TailoringResult,
} from './tailor'
