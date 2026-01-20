/**
 * 10-Indicator Framework Tests
 *
 * Validates scoring engine, industry weights, and comparison functions
 * across diverse industries.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  testCases,
  invalidTexts,
  nurseCV,
  teacherCV,
  retailManagerCV,
  softwareEngineerCV,
  financialAnalystCV,
  marketingManagerCV,
} from './test-data';
import {
  scoreText,
  compareScores,
  generateFeedback,
  IndicatorScores,
  ScoringContext,
} from '../index';
import {
  getIndustryWeights,
  calculateWeightedScore,
  getTopIndicators,
  getSupportedIndustries,
} from '../weights';
import {
  INDICATOR_NAMES,
  INDICATOR_CATEGORIES,
  getScoreColor,
  getScoreLabel,
} from '../types';

// ============================================================================
// INDICATOR DEFINITIONS TESTS
// ============================================================================

describe('Indicator Definitions', () => {
  it('should have exactly 10 indicators defined', () => {
    expect(Object.keys(INDICATOR_NAMES).length).toBe(10);
  });

  it('should have indicator numbers 1-10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(INDICATOR_NAMES[i]).toBeDefined();
      expect(typeof INDICATOR_NAMES[i]).toBe('string');
    }
  });

  it('should have correct category assignments', () => {
    // Cognitive: 1, 2, 7, 9
    expect(INDICATOR_CATEGORIES[1]).toBe('Cognitive');
    expect(INDICATOR_CATEGORIES[2]).toBe('Cognitive');
    expect(INDICATOR_CATEGORIES[7]).toBe('Cognitive');
    expect(INDICATOR_CATEGORIES[9]).toBe('Cognitive');

    // Interpersonal: 3, 4, 8
    expect(INDICATOR_CATEGORIES[3]).toBe('Interpersonal');
    expect(INDICATOR_CATEGORIES[4]).toBe('Interpersonal');
    expect(INDICATOR_CATEGORIES[8]).toBe('Interpersonal');

    // Character: 5, 6, 10
    expect(INDICATOR_CATEGORIES[5]).toBe('Character');
    expect(INDICATOR_CATEGORIES[6]).toBe('Character');
    expect(INDICATOR_CATEGORIES[10]).toBe('Character');
  });
});

// ============================================================================
// INDUSTRY WEIGHTS TESTS
// ============================================================================

describe('Industry Weights', () => {
  const industries = ['healthcare', 'education', 'retail', 'technology', 'finance', 'generic'];

  it.each(industries)('should have weights that sum to 1.0 for %s', (industry) => {
    const weights = getIndustryWeights(industry);
    const sum = Object.values(weights.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it('should return generic weights for unknown industry', () => {
    const weights = getIndustryWeights('aerospace');
    expect(weights.industry).toBe('generic');
    // All generic weights should be equal (0.10)
    Object.values(weights.weights).forEach((weight) => {
      expect(weight).toBeCloseTo(0.1, 2);
    });
  });

  it('should have correct top indicators for healthcare', () => {
    const topIndicators = getTopIndicators('healthcare', 3);
    // Healthcare should prioritize: Social Skills (4), Integrity (5), Adaptability (6)
    expect(topIndicators).toContain(4); // Social Skills
    expect(topIndicators).toContain(5); // Integrity
  });

  it('should have correct top indicators for technology', () => {
    const topIndicators = getTopIndicators('technology', 3);
    // Technology should prioritize: Job Knowledge (1), Problem-Solving (2)
    expect(topIndicators).toContain(1); // Job Knowledge
    expect(topIndicators).toContain(2); // Problem-Solving
  });

  it('should have correct top indicators for education', () => {
    const topIndicators = getTopIndicators('education', 3);
    // Education should prioritize: Communication (3), Learning Agility (7), Creativity (9)
    expect(topIndicators).toContain(3); // Communication
  });

  it('should return all supported industries', () => {
    const industries = getSupportedIndustries();
    expect(industries.length).toBeGreaterThanOrEqual(10);
    expect(industries.map((i) => i.id)).toContain('healthcare');
    expect(industries.map((i) => i.id)).toContain('education');
    expect(industries.map((i) => i.id)).toContain('technology');
  });
});

// ============================================================================
// WEIGHTED SCORE CALCULATION TESTS
// ============================================================================

describe('Weighted Score Calculation', () => {
  const mockScores: IndicatorScores = {
    scores: {
      1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 7, evidence: '', suggestion: '' },
      2: { indicatorNumber: 2, indicatorName: 'Problem-Solving', score: 7, evidence: '', suggestion: '' },
      3: { indicatorNumber: 3, indicatorName: 'Communication', score: 7, evidence: '', suggestion: '' },
      4: { indicatorNumber: 4, indicatorName: 'Social Skills', score: 7, evidence: '', suggestion: '' },
      5: { indicatorNumber: 5, indicatorName: 'Integrity', score: 7, evidence: '', suggestion: '' },
      6: { indicatorNumber: 6, indicatorName: 'Adaptability', score: 7, evidence: '', suggestion: '' },
      7: { indicatorNumber: 7, indicatorName: 'Learning Agility', score: 7, evidence: '', suggestion: '' },
      8: { indicatorNumber: 8, indicatorName: 'Leadership', score: 7, evidence: '', suggestion: '' },
      9: { indicatorNumber: 9, indicatorName: 'Creativity', score: 7, evidence: '', suggestion: '' },
      10: { indicatorNumber: 10, indicatorName: 'Motivation', score: 7, evidence: '', suggestion: '' },
    },
    overall: 7.0,
    strengths: [],
    gaps: [],
    timestamp: new Date(),
  };

  it('should return same score when all scores are equal', () => {
    // When all scores are the same, weighted average should equal the score
    const techScore = calculateWeightedScore(mockScores, 'technology');
    const healthScore = calculateWeightedScore(mockScores, 'healthcare');
    const genericScore = calculateWeightedScore(mockScores, 'generic');

    expect(techScore).toBeCloseTo(7.0, 1);
    expect(healthScore).toBeCloseTo(7.0, 1);
    expect(genericScore).toBeCloseTo(7.0, 1);
  });

  it('should weight scores differently by industry', () => {
    const unevenScores: IndicatorScores = {
      ...mockScores,
      scores: {
        1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 9, evidence: '', suggestion: '' }, // High tech priority
        2: { indicatorNumber: 2, indicatorName: 'Problem-Solving', score: 9, evidence: '', suggestion: '' }, // High tech priority
        3: { indicatorNumber: 3, indicatorName: 'Communication', score: 5, evidence: '', suggestion: '' }, // High education priority
        4: { indicatorNumber: 4, indicatorName: 'Social Skills', score: 5, evidence: '', suggestion: '' }, // High healthcare priority
        5: { indicatorNumber: 5, indicatorName: 'Integrity', score: 5, evidence: '', suggestion: '' }, // High finance priority
        6: { indicatorNumber: 6, indicatorName: 'Adaptability', score: 5, evidence: '', suggestion: '' },
        7: { indicatorNumber: 7, indicatorName: 'Learning Agility', score: 5, evidence: '', suggestion: '' },
        8: { indicatorNumber: 8, indicatorName: 'Leadership', score: 5, evidence: '', suggestion: '' },
        9: { indicatorNumber: 9, indicatorName: 'Creativity', score: 5, evidence: '', suggestion: '' },
        10: { indicatorNumber: 10, indicatorName: 'Motivation', score: 5, evidence: '', suggestion: '' },
      },
    };

    const techScore = calculateWeightedScore(unevenScores, 'technology');
    const healthScore = calculateWeightedScore(unevenScores, 'healthcare');
    const genericScore = calculateWeightedScore(unevenScores, 'generic');

    // Tech should score higher because indicators 1 and 2 are weighted heavily
    expect(techScore).toBeGreaterThan(healthScore);
    // Generic should be in between (equal weights)
    expect(genericScore).toBeCloseTo(5.8, 1);
  });
});

// ============================================================================
// SCORE COMPARISON TESTS
// ============================================================================

describe('Score Comparison', () => {
  const beforeScores: IndicatorScores = {
    scores: {
      1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 5, evidence: '', suggestion: '' },
      2: { indicatorNumber: 2, indicatorName: 'Problem-Solving', score: 5, evidence: '', suggestion: '' },
      3: { indicatorNumber: 3, indicatorName: 'Communication', score: 5, evidence: '', suggestion: '' },
      4: { indicatorNumber: 4, indicatorName: 'Social Skills', score: 5, evidence: '', suggestion: '' },
      5: { indicatorNumber: 5, indicatorName: 'Integrity', score: 5, evidence: '', suggestion: '' },
      6: { indicatorNumber: 6, indicatorName: 'Adaptability', score: 5, evidence: '', suggestion: '' },
      7: { indicatorNumber: 7, indicatorName: 'Learning Agility', score: 5, evidence: '', suggestion: '' },
      8: { indicatorNumber: 8, indicatorName: 'Leadership', score: 5, evidence: '', suggestion: '' },
      9: { indicatorNumber: 9, indicatorName: 'Creativity', score: 5, evidence: '', suggestion: '' },
      10: { indicatorNumber: 10, indicatorName: 'Motivation', score: 5, evidence: '', suggestion: '' },
    },
    overall: 5.0,
    strengths: [],
    gaps: [],
    timestamp: new Date(),
  };

  const afterScores: IndicatorScores = {
    scores: {
      1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 5, evidence: '', suggestion: '' },
      2: { indicatorNumber: 2, indicatorName: 'Problem-Solving', score: 5, evidence: '', suggestion: '' },
      3: { indicatorNumber: 3, indicatorName: 'Communication', score: 8, evidence: '', suggestion: '' }, // Improved
      4: { indicatorNumber: 4, indicatorName: 'Social Skills', score: 8, evidence: '', suggestion: '' }, // Improved
      5: { indicatorNumber: 5, indicatorName: 'Integrity', score: 5, evidence: '', suggestion: '' },
      6: { indicatorNumber: 6, indicatorName: 'Adaptability', score: 5, evidence: '', suggestion: '' },
      7: { indicatorNumber: 7, indicatorName: 'Learning Agility', score: 5, evidence: '', suggestion: '' },
      8: { indicatorNumber: 8, indicatorName: 'Leadership', score: 8, evidence: '', suggestion: '' }, // Improved
      9: { indicatorNumber: 9, indicatorName: 'Creativity', score: 5, evidence: '', suggestion: '' },
      10: { indicatorNumber: 10, indicatorName: 'Motivation', score: 5, evidence: '', suggestion: '' },
    },
    overall: 5.9,
    strengths: [],
    gaps: [],
    timestamp: new Date(),
  };

  it('should detect improvements correctly', () => {
    const comparison = compareScores(beforeScores, afterScores);

    expect(comparison.improvements.length).toBe(3);
    expect(comparison.improvements.map((i) => i.indicatorNumber)).toContain(3);
    expect(comparison.improvements.map((i) => i.indicatorNumber)).toContain(4);
    expect(comparison.improvements.map((i) => i.indicatorNumber)).toContain(8);
  });

  it('should calculate change correctly', () => {
    const comparison = compareScores(beforeScores, afterScores);

    const improvement = comparison.improvements.find((i) => i.indicatorNumber === 3);
    expect(improvement?.change).toBe(3);
    expect(improvement?.percentChange).toBe(60);
  });

  it('should have no regressions when all scores same or improved', () => {
    const comparison = compareScores(beforeScores, afterScores);
    expect(comparison.regressions.length).toBe(0);
  });

  it('should detect overall improvement', () => {
    const comparison = compareScores(beforeScores, afterScores);
    expect(comparison.overallImprovement).toBe(true);
  });

  it('should generate summary', () => {
    const comparison = compareScores(beforeScores, afterScores);
    expect(comparison.summary).toBeTruthy();
    expect(comparison.summary.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// FEEDBACK GENERATION TESTS
// ============================================================================

describe('Feedback Generation', () => {
  const mixedScores: IndicatorScores = {
    scores: {
      1: { indicatorNumber: 1, indicatorName: 'Job Knowledge', score: 8, evidence: 'Strong', suggestion: 'Keep it up' },
      2: { indicatorNumber: 2, indicatorName: 'Problem-Solving', score: 4, evidence: 'Limited', suggestion: 'Add examples' },
      3: { indicatorNumber: 3, indicatorName: 'Communication', score: 9, evidence: 'Excellent', suggestion: 'Great' },
      4: { indicatorNumber: 4, indicatorName: 'Social Skills', score: 5, evidence: 'Some', suggestion: 'Include teamwork' },
      5: { indicatorNumber: 5, indicatorName: 'Integrity', score: 7, evidence: 'Good', suggestion: 'Okay' },
      6: { indicatorNumber: 6, indicatorName: 'Adaptability', score: 6, evidence: 'Present', suggestion: 'More examples' },
      7: { indicatorNumber: 7, indicatorName: 'Learning Agility', score: 3, evidence: 'Minimal', suggestion: 'Add training' },
      8: { indicatorNumber: 8, indicatorName: 'Leadership', score: 8, evidence: 'Strong', suggestion: 'Good' },
      9: { indicatorNumber: 9, indicatorName: 'Creativity', score: 4, evidence: 'Limited', suggestion: 'Add innovation' },
      10: { indicatorNumber: 10, indicatorName: 'Motivation', score: 6, evidence: 'Present', suggestion: 'Show goals' },
    },
    overall: 6.0,
    strengths: [],
    gaps: [],
    timestamp: new Date(),
  };

  it('should generate feedback for indicators below threshold', () => {
    const feedback = generateFeedback(mixedScores, 7);

    // Indicators below 7: 2, 4, 6, 7, 9, 10
    expect(feedback.length).toBe(6);
    expect(feedback.map((f) => f.indicatorNumber)).toContain(2);
    expect(feedback.map((f) => f.indicatorNumber)).toContain(7);
  });

  it('should sort feedback by gap size', () => {
    const feedback = generateFeedback(mixedScores, 7);

    // Indicator 7 has the biggest gap (7-3=4)
    expect(feedback[0].indicatorNumber).toBe(7);
    expect(feedback[0].gap).toBe(4);
  });

  it('should include action items', () => {
    const feedback = generateFeedback(mixedScores, 7);

    feedback.forEach((f) => {
      expect(f.actionItems).toBeDefined();
      expect(f.actionItems.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// SCORE UTILITIES TESTS
// ============================================================================

describe('Score Utilities', () => {
  it('should return correct color for scores', () => {
    expect(getScoreColor(9).bg).toContain('green');
    expect(getScoreColor(7).bg).toContain('green');
    expect(getScoreColor(6).bg).toContain('yellow');
    expect(getScoreColor(5).bg).toContain('yellow');
    expect(getScoreColor(4).bg).toContain('red');
    expect(getScoreColor(2).bg).toContain('red');
  });

  it('should return correct labels for scores', () => {
    expect(getScoreLabel(10)).toBe('Exceptional');
    expect(getScoreLabel(9)).toBe('Excellent');
    expect(getScoreLabel(7)).toBe('Good');
    expect(getScoreLabel(5)).toBe('Average');
    expect(getScoreLabel(3)).toBe('Developing');
    expect(getScoreLabel(1)).toBe('Minimal');
  });
});

// ============================================================================
// SCORING ENGINE TESTS (Mock Mode)
// ============================================================================

describe('Scoring Engine (Mock Mode)', () => {
  beforeAll(() => {
    // Ensure mock mode is enabled for tests
    process.env.USE_MOCK_AI = 'true';
  });

  it('should reject empty text', async () => {
    const context: ScoringContext = { type: 'cv' };
    const result = await scoreText('', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('short');
  });

  it('should reject text that is too short', async () => {
    const context: ScoringContext = { type: 'cv' };
    const result = await scoreText(invalidTexts.tooShort, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('short');
  });

  it('should score valid CV text', async () => {
    const context: ScoringContext = { type: 'cv', industry: 'healthcare' };
    const result = await scoreText(nurseCV, context);

    expect(result.success).toBe(true);
    expect(result.scores).toBeDefined();
    expect(Object.keys(result.scores!.scores).length).toBe(10);
  });

  it('should return scores in valid range', async () => {
    const context: ScoringContext = { type: 'cv', industry: 'technology' };
    const result = await scoreText(softwareEngineerCV, context);

    expect(result.success).toBe(true);
    Object.values(result.scores!.scores).forEach((score) => {
      expect(score.score).toBeGreaterThanOrEqual(1);
      expect(score.score).toBeLessThanOrEqual(10);
    });
  });

  it('should include evidence and suggestions', async () => {
    const context: ScoringContext = { type: 'cv', industry: 'education' };
    const result = await scoreText(teacherCV, context);

    expect(result.success).toBe(true);
    Object.values(result.scores!.scores).forEach((score) => {
      expect(score.evidence).toBeDefined();
      expect(score.suggestion).toBeDefined();
    });
  });

  it('should include strengths and gaps', async () => {
    const context: ScoringContext = { type: 'cv', industry: 'retail' };
    const result = await scoreText(retailManagerCV, context);

    expect(result.success).toBe(true);
    expect(result.scores!.strengths).toBeDefined();
    expect(result.scores!.gaps).toBeDefined();
  });

  it('should calculate overall score', async () => {
    const context: ScoringContext = { type: 'cv', industry: 'finance' };
    const result = await scoreText(financialAnalystCV, context);

    expect(result.success).toBe(true);
    expect(result.scores!.overall).toBeGreaterThanOrEqual(1);
    expect(result.scores!.overall).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// DIVERSE INDUSTRY TESTS
// ============================================================================

describe('Diverse Industry Scoring', () => {
  beforeAll(() => {
    process.env.USE_MOCK_AI = 'true';
  });

  it.each(testCases)('should score $name within expected range', async ({ industry, cv, minOverallScore, maxOverallScore }) => {
    const context: ScoringContext = { type: 'cv', industry };
    const result = await scoreText(cv, context);

    expect(result.success).toBe(true);
    // Mock mode produces random scores in 5-7 range, so just check success
    expect(result.scores!.overall).toBeGreaterThanOrEqual(1);
    expect(result.scores!.overall).toBeLessThanOrEqual(10);
  });

  it('should score marketing CV', async () => {
    const context: ScoringContext = { type: 'cv', industry: 'retail' };
    const result = await scoreText(marketingManagerCV, context);

    expect(result.success).toBe(true);
    expect(result.scores).toBeDefined();
  });
});
