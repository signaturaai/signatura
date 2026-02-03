/**
 * Tailoring Editor Logic Tests — RALPH Structure
 *
 * R — Requirements: extractJobKeywords, findKeywordMatches return correct structures
 * A — Analysis: keyword extraction accuracy, match positioning
 * L — Logic: detectGapClosures identifies principle-level gaps correctly
 * P — Preservation: analyzeTailoringPair wires all stages together
 * H — Hardening: edge cases, empty inputs, overlap prevention, performance
 */

import { describe, it, expect } from 'vitest'
import {
  extractJobKeywords,
  findKeywordMatches,
  detectGapClosures,
  analyzeTailoringPair,
} from '@/lib/ai/siggy-integration-guide'

// =========================================================================
// R — Requirements: return structure validation
// =========================================================================

describe('R — Requirements: extractJobKeywords structure', () => {
  const SAMPLE_JD = 'We need a Product Manager with experience in agile methodology, data-driven decisions, and stakeholder management. Must know Python, SQL, and Jira.'

  it('should return an array of strings', () => {
    const result = extractJobKeywords(SAMPLE_JD)
    expect(Array.isArray(result)).toBe(true)
    result.forEach(kw => expect(typeof kw).toBe('string'))
  })

  it('should return keywords sorted longest-first', () => {
    const result = extractJobKeywords(SAMPLE_JD)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].length).toBeLessThanOrEqual(result[i - 1].length)
    }
  })

  it('should return no duplicates', () => {
    const result = extractJobKeywords(SAMPLE_JD)
    const unique = new Set(result)
    expect(unique.size).toBe(result.length)
  })
})

describe('R — Requirements: findKeywordMatches structure', () => {
  it('should return array of KeywordMatch objects', () => {
    const matches = findKeywordMatches('Led agile sprint planning', ['agile', 'sprint'])
    expect(Array.isArray(matches)).toBe(true)
    matches.forEach(m => {
      expect(typeof m.keyword).toBe('string')
      expect(typeof m.startIndex).toBe('number')
      expect(typeof m.endIndex).toBe('number')
    })
  })

  it('should return matches sorted by startIndex', () => {
    const matches = findKeywordMatches('Used Python and SQL for analytics', ['python', 'sql', 'analytics'])
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].startIndex).toBeGreaterThan(matches[i - 1].startIndex)
    }
  })
})

describe('R — Requirements: detectGapClosures structure', () => {
  it('should return array of GapClosure objects', () => {
    const closures = detectGapClosures(
      'Managed daily standups',
      'Led cross-functional team of 12 stakeholders, aligned on product strategy'
    )
    expect(Array.isArray(closures)).toBe(true)
    closures.forEach(c => {
      expect(typeof c.gapName).toBe('string')
      expect(typeof c.principleId).toBe('string')
    })
  })
})

describe('R — Requirements: analyzeTailoringPair structure', () => {
  it('should return a TailoringAnalysis object with all fields', () => {
    const result = analyzeTailoringPair(
      'Did some tasks',
      'Improved conversion by 15% through data-driven A/B testing',
      ['conversion', 'data-driven']
    )
    expect(result).toHaveProperty('matchedKeywords')
    expect(result).toHaveProperty('gapsClosing')
    expect(result).toHaveProperty('scoreDelta')
    expect(result).toHaveProperty('originalScore')
    expect(result).toHaveProperty('suggestedScore')
    expect(typeof result.scoreDelta).toBe('number')
    expect(typeof result.originalScore).toBe('number')
    expect(typeof result.suggestedScore).toBe('number')
  })
})

// =========================================================================
// A — Analysis: keyword extraction and matching accuracy
// =========================================================================

describe('A — Analysis: keyword extraction accuracy', () => {
  it('should extract multi-word phrases from JD', () => {
    const jd = 'Looking for someone with project management and stakeholder management skills'
    const keywords = extractJobKeywords(jd)
    expect(keywords).toContain('project management')
    expect(keywords).toContain('stakeholder management')
  })

  it('should extract single-word technical keywords', () => {
    const jd = 'Proficiency in Python, SQL, and React required. Must know Jira.'
    const keywords = extractJobKeywords(jd)
    expect(keywords).toContain('python')
    expect(keywords).toContain('sql')
    expect(keywords).toContain('react')
    expect(keywords).toContain('jira')
  })

  it('should extract capitalized proper noun tools', () => {
    const jd = 'Experience with Amplitude and Tableau dashboards preferred'
    const keywords = extractJobKeywords(jd)
    expect(keywords).toContain('amplitude')
    expect(keywords).toContain('tableau')
  })

  it('should detect agile methodology as multi-word phrase', () => {
    const jd = 'Must follow agile methodology in fast-paced environment'
    const keywords = extractJobKeywords(jd)
    expect(keywords).toContain('agile methodology')
  })
})

describe('A — Analysis: findKeywordMatches positioning', () => {
  it('should find exact keyword positions in text', () => {
    const text = 'Built React dashboard with SQL analytics'
    const matches = findKeywordMatches(text, ['react', 'sql'])
    const reactMatch = matches.find(m => m.keyword.toLowerCase() === 'react')
    expect(reactMatch).toBeDefined()
    expect(text.substring(reactMatch!.startIndex, reactMatch!.endIndex).toLowerCase()).toBe('react')
  })

  it('should preserve original casing in keyword field', () => {
    const text = 'Deployed Docker containers on AWS infrastructure'
    const matches = findKeywordMatches(text, ['docker', 'aws'])
    const dockerMatch = matches.find(m => m.keyword.toLowerCase() === 'docker')
    expect(dockerMatch!.keyword).toBe('Docker') // preserves original casing
  })

  it('should respect word boundaries — no partial matches', () => {
    const text = 'The team managed the sprint backlog'
    const matches = findKeywordMatches(text, ['tea']) // should NOT match inside 'team'
    expect(matches.length).toBe(0)
  })

  it('should find multiple occurrences of same keyword', () => {
    const text = 'Used agile for planning and agile for delivery'
    const matches = findKeywordMatches(text, ['agile'])
    expect(matches.length).toBe(2)
  })
})

// =========================================================================
// L — Logic: gap closure detection
// =========================================================================

describe('L — Logic: detectGapClosures identifies principle gaps', () => {
  it('should detect outcome-over-output gap closure', () => {
    const original = 'Managed the project timeline'
    const suggested = 'Achieved 30% improvement in delivery speed, resulting in increased customer retention'
    const closures = detectGapClosures(original, suggested)
    const outcome = closures.find(c => c.principleId === 'outcome-over-output')
    expect(outcome).toBeDefined()
    expect(outcome!.gapName).toBe('Outcomes')
  })

  it('should detect data-driven gap closure', () => {
    const original = 'Worked on the project timeline'
    const suggested = 'Leveraged data and metrics to drive 40% increase in conversion rate'
    const closures = detectGapClosures(original, suggested)
    const dataGap = closures.find(c => c.principleId === 'data-driven-decisions')
    expect(dataGap).toBeDefined()
  })

  it('should detect cross-functional-leadership gap closure', () => {
    const original = 'Did product work'
    const suggested = 'Led cross-functional team of engineers and stakeholders, aligned on quarterly roadmap'
    const closures = detectGapClosures(original, suggested)
    const leadership = closures.find(c => c.principleId === 'cross-functional-leadership')
    expect(leadership).toBeDefined()
  })

  it('should NOT report closure when original already has keywords', () => {
    const original = 'Led team of stakeholders aligned on strategy'
    const suggested = 'Led cross-functional team of stakeholders aligned on product strategy'
    const closures = detectGapClosures(original, suggested)
    // Original already has 'led', 'team', 'stakeholder', 'aligned' — should not be "closed"
    const leadership = closures.find(c => c.principleId === 'cross-functional-leadership')
    expect(leadership).toBeUndefined()
  })

  it('should NOT report closure when suggested has fewer than 2 hits', () => {
    const original = 'Managed tasks'
    const suggested = 'Managed team tasks efficiently'
    // 'team' is only 1 keyword hit for leadership, need 2+
    const closures = detectGapClosures(original, suggested)
    const leadership = closures.find(c => c.principleId === 'cross-functional-leadership')
    expect(leadership).toBeUndefined()
  })

  it('should detect multiple gap closures in a single suggestion', () => {
    const original = 'Supported various projects'
    const suggested = 'Led cross-functional team of stakeholders, increasing revenue by 40% using data and metrics'
    const closures = detectGapClosures(original, suggested)
    // leadership: led, cross-functional, team, stakeholder = 4 hits; data-driven: %, data, metrics = 3 hits
    expect(closures.length).toBeGreaterThanOrEqual(2)
  })
})

// =========================================================================
// P — Preservation: analyzeTailoringPair integration
// =========================================================================

describe('P — Preservation: analyzeTailoringPair wires all stages', () => {
  const JD = 'Senior Product Manager with experience in agile methodology, roadmap strategy, analytics. Must know SQL and Python.'
  const keywords = extractJobKeywords(JD)

  it('should detect matched keywords in suggested bullet', () => {
    const result = analyzeTailoringPair(
      'Managed product features',
      'Defined product roadmap and strategy using analytics and SQL queries',
      keywords
    )
    expect(result.matchedKeywords.length).toBeGreaterThan(0)
  })

  it('should compute score delta between original and suggested', () => {
    const result = analyzeTailoringPair(
      'Did some work',
      'Led product roadmap strategy, achieving 25% revenue growth through data-driven analytics',
      keywords,
      'Product Manager'
    )
    // Suggested is clearly stronger than original
    expect(result.suggestedScore).toBeGreaterThan(result.originalScore)
    expect(result.scoreDelta).toBeGreaterThan(0)
  })

  it('should wire gap closures from detectGapClosures', () => {
    const result = analyzeTailoringPair(
      'Handled daily tasks',
      'Achieved 40% improvement in user retention, resulting in increased customer satisfaction through data and metrics',
      keywords
    )
    // Should detect outcome-over-output and/or data-driven closures
    expect(result.gapsClosing.length).toBeGreaterThan(0)
  })

  it('should pass jobTitle to CV analysis when provided', () => {
    const withTitle = analyzeTailoringPair(
      'Managed backlog',
      'Led product roadmap strategy with RICE prioritization, achieving 20% efficiency gain',
      keywords,
      'Product Manager'
    )
    const withoutTitle = analyzeTailoringPair(
      'Managed backlog',
      'Led product roadmap strategy with RICE prioritization, achieving 20% efficiency gain',
      keywords
    )
    // Both should succeed, PM title may boost score
    expect(typeof withTitle.scoreDelta).toBe('number')
    expect(typeof withoutTitle.scoreDelta).toBe('number')
  })
})

// =========================================================================
// H — Hardening: edge cases, empty inputs, performance
// =========================================================================

describe('H — Hardening: extractJobKeywords edge cases', () => {
  it('should return empty array for empty string', () => {
    expect(extractJobKeywords('')).toEqual([])
  })

  it('should return empty array for whitespace-only input', () => {
    expect(extractJobKeywords('   ')).toEqual([])
  })

  it('should handle very long JD without crashing', () => {
    const longJD = 'We need a Product Manager. '.repeat(500)
    const result = extractJobKeywords(longJD)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should handle JD with no recognizable keywords', () => {
    const result = extractJobKeywords('Hello world, we like sandwiches.')
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('H — Hardening: findKeywordMatches edge cases', () => {
  it('should return empty array when no keywords provided', () => {
    expect(findKeywordMatches('Some text here', [])).toEqual([])
  })

  it('should return empty array when text is empty', () => {
    expect(findKeywordMatches('', ['python'])).toEqual([])
  })

  it('should prevent overlapping matches (longer keyword wins)', () => {
    // 'project management' should win over 'project' if both provided
    const text = 'Expert in project management'
    const matches = findKeywordMatches(text, ['project management', 'project'])
    // The longer match should be present
    const pmMatch = matches.find(m => m.keyword.toLowerCase() === 'project management')
    expect(pmMatch).toBeDefined()
    // Check that no match overlaps with the project management range
    const overlapping = matches.filter(m =>
      m !== pmMatch && m.startIndex >= pmMatch!.startIndex && m.startIndex < pmMatch!.endIndex
    )
    expect(overlapping.length).toBe(0)
  })

  it('should handle keyword at start of text', () => {
    const matches = findKeywordMatches('Python is great', ['python'])
    expect(matches.length).toBe(1)
    expect(matches[0].startIndex).toBe(0)
  })

  it('should handle keyword at end of text', () => {
    const matches = findKeywordMatches('I know Python', ['python'])
    expect(matches.length).toBe(1)
    expect(matches[0].endIndex).toBe('I know Python'.length)
  })
})

describe('H — Hardening: detectGapClosures edge cases', () => {
  it('should handle empty bullets', () => {
    expect(detectGapClosures('', '')).toEqual([])
  })

  it('should return empty array when both bullets are identical', () => {
    const bullet = 'Led team and stakeholders to aligned outcomes'
    const closures = detectGapClosures(bullet, bullet)
    expect(closures).toEqual([])
  })
})

describe('H — Hardening: analyzeTailoringPair edge cases', () => {
  it('should handle empty keywords array', () => {
    const result = analyzeTailoringPair('Original', 'Suggested', [])
    expect(result.matchedKeywords).toEqual([])
    expect(typeof result.scoreDelta).toBe('number')
  })

  it('should handle very short bullets', () => {
    const result = analyzeTailoringPair('Did work', 'Did work', ['python'])
    expect(typeof result.scoreDelta).toBe('number')
    expect(result.scoreDelta).toBe(0) // identical bullets = same score
  })
})
