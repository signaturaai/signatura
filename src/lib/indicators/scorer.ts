/**
 * Indicator Scoring Engine
 *
 * Uses GPT-4 to analyze text and score against the 10-Indicator Framework.
 * Designed for ALL professions and industries - healthcare, education,
 * retail, finance, technology, and beyond.
 */

import OpenAI from 'openai'
import {
  IndicatorScores,
  IndicatorScore,
  ScoreComparison,
  IndicatorDelta,
  Feedback,
  ScoringContext,
  ScoringResult,
  INDICATOR_NAMES,
} from './types'
import { calculateWeightedScore } from './weights'

// Lazy-initialize OpenAI client
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'

/**
 * Build the scoring prompt for GPT-4
 */
function buildScoringPrompt(text: string, context: ScoringContext): string {
  const industryNote = context.industry
    ? `The candidate is in the ${context.industry} industry/field.`
    : 'The industry is not specified - use universal criteria.'

  const roleNote = context.role
    ? `They are applying for or working as: ${context.role}`
    : ''

  const typeNote = {
    cv: 'This is a CV/resume. Score based on demonstrated experience and achievements.',
    interview: 'This is an interview response. Score based on how well they articulate their capabilities.',
    job_description: 'This is a job description. Identify which indicators are most important for this role.',
    general: 'Score based on all available evidence in the text.',
  }[context.type]

  return `You are an expert evaluator using a research-backed 10-Indicator Assessment Framework.

CRITICAL: This framework applies to ALL professions and industries - from healthcare to education, retail to technology, construction to finance. Do NOT favor any industry over another.

${industryNote}
${roleNote}

${typeNote}

Analyze this text and score it on each indicator (1-10 scale):

---TEXT TO ANALYZE---
${text}
---END TEXT---

THE 10 INDICATORS TO SCORE:

1. Job Knowledge & Technical Skills
   - Domain expertise in their field (medical knowledge, teaching methods, financial analysis, etc.)
   - Professional competencies specific to their role
   - Mastery of relevant tools/systems (EHR systems, educational tech, POS systems, specialized software)

2. Problem-Solving & Critical Thinking
   - Analytical reasoning and breaking down complex issues
   - Creative solutions within professional constraints
   - Quality of decisions and root cause analysis

3. Communication & Articulation
   - Verbal clarity (with patients, students, customers, colleagues)
   - Written communication (documentation, reports, emails)
   - Active listening and presentation skills

4. Social Skills & Interpersonal Ability
   - Team collaboration in any setting
   - Conflict resolution with various stakeholders
   - Empathy and relationship building

5. Integrity & Ethical Standards
   - Honesty and accountability
   - Ethical decision-making in professional context
   - Transparency and trustworthiness

6. Adaptability & Flexibility
   - Handling change (new protocols, systems, procedures)
   - Resilience under pressure
   - Open-mindedness and stress tolerance

7. Learning Agility & Growth Mindset
   - Speed of learning new skills/knowledge
   - Professional development activities
   - Self-awareness and feedback receptiveness

8. Leadership & Initiative
   - Taking ownership without being asked
   - Motivating and guiding others (at any level)
   - Strategic thinking and vision

9. Creativity & Innovation
   - Original thinking and novel approaches
   - Idea generation and experimentation
   - Appropriate risk-taking

10. Motivation & Drive
    - Goal orientation and persistence
    - Work ethic and dedication
    - Ambition for growth/excellence

SCORING GUIDELINES:
- 9-10: Exceptional - Multiple strong examples, clearly demonstrated
- 7-8: Strong - Good evidence, well-articulated
- 5-6: Adequate - Some evidence, room for improvement
- 3-4: Developing - Limited evidence, needs work
- 1-2: Minimal - Little to no evidence

IMPORTANT RULES:
1. Use industry-appropriate language in your feedback
   - For nurses: "patient care", "clinical skills", "triage protocols"
   - For teachers: "student engagement", "curriculum", "classroom management"
   - For retail: "customer service", "sales performance", "inventory"
   - For tech: "system design", "code quality", "technical architecture"

2. "Technical skills" means different things in different fields:
   - Nurse: medication administration, patient assessment, medical procedures
   - Teacher: lesson planning, differentiated instruction, assessment design
   - Retail manager: inventory systems, merchandising, POS operations
   - Accountant: financial modeling, audit procedures, tax regulations

3. Score based ONLY on evidence in the text, not assumptions about the industry

4. A nurse with strong clinical skills should score as high as an engineer with strong coding skills - both demonstrate indicator 1

Return your analysis as JSON with this exact structure:
{
  "scores": {
    "1": { "score": 7, "evidence": "Specific quote or example from text", "suggestion": "Actionable improvement" },
    "2": { "score": 6, "evidence": "...", "suggestion": "..." },
    "3": { "score": 8, "evidence": "...", "suggestion": "..." },
    "4": { "score": 7, "evidence": "...", "suggestion": "..." },
    "5": { "score": 6, "evidence": "...", "suggestion": "..." },
    "6": { "score": 7, "evidence": "...", "suggestion": "..." },
    "7": { "score": 5, "evidence": "...", "suggestion": "..." },
    "8": { "score": 6, "evidence": "...", "suggestion": "..." },
    "9": { "score": 5, "evidence": "...", "suggestion": "..." },
    "10": { "score": 7, "evidence": "...", "suggestion": "..." }
  },
  "overall": 6.4,
  "strengths": ["Top 2-3 strengths with specific evidence"],
  "gaps": ["Top 2-3 gaps with specific improvement suggestions"]
}

Respond ONLY with valid JSON, no other text.`
}

/**
 * Parse GPT response into IndicatorScores
 */
function parseGPTResponse(
  response: string,
  context: ScoringContext
): IndicatorScores | null {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7)
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3)
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3)
    }

    const parsed = JSON.parse(cleanResponse)

    // Build the scores record
    const scores: Record<number, IndicatorScore> = {}

    for (let i = 1; i <= 10; i++) {
      const scoreData = parsed.scores[i.toString()] || parsed.scores[i]
      if (scoreData) {
        scores[i] = {
          indicatorNumber: i,
          indicatorName: INDICATOR_NAMES[i],
          score: Math.min(10, Math.max(1, scoreData.score)),
          evidence: scoreData.evidence || 'No specific evidence provided',
          suggestion: scoreData.suggestion || 'No suggestion provided',
        }
      } else {
        // Default if missing
        scores[i] = {
          indicatorNumber: i,
          indicatorName: INDICATOR_NAMES[i],
          score: 5,
          evidence: 'Unable to assess from provided text',
          suggestion: 'Provide more information demonstrating this indicator',
        }
      }
    }

    return {
      scores,
      overall: parsed.overall || calculateSimpleAverage(scores),
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || [],
      industry: context.industry,
      context: context.type,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Error parsing GPT response:', error)
    console.error('Raw response:', response)
    return null
  }
}

/**
 * Calculate simple average of scores
 */
function calculateSimpleAverage(scores: Record<number, IndicatorScore>): number {
  const values = Object.values(scores).map(s => s.score)
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/**
 * Score text against the 10-Indicator Framework
 *
 * @param text - The text to analyze (CV, interview response, etc.)
 * @param context - Scoring context (type, industry, role)
 * @param indicatorIds - Optional: only score specific indicators
 * @returns Indicator scores with evidence and suggestions
 */
export async function scoreText(
  text: string,
  context: ScoringContext,
  indicatorIds?: number[]
): Promise<ScoringResult> {
  // Validate input
  if (!text || text.trim().length < 50) {
    return {
      success: false,
      error: 'Text is too short to analyze. Please provide at least 50 characters.',
    }
  }

  // Check for mock mode
  if (process.env.USE_MOCK_AI === 'true') {
    return getMockScores(text, context)
  }

  try {
    const prompt = buildScoringPrompt(text, context)

    const response = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert assessment evaluator. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for consistent scoring
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        error: 'No response from AI model',
      }
    }

    const scores = parseGPTResponse(content, context)
    if (!scores) {
      return {
        success: false,
        error: 'Failed to parse AI response',
      }
    }

    // Filter to specific indicators if requested
    if (indicatorIds && indicatorIds.length > 0) {
      const filteredScores: Record<number, IndicatorScore> = {}
      for (const id of indicatorIds) {
        if (scores.scores[id]) {
          filteredScores[id] = scores.scores[id]
        }
      }
      scores.scores = filteredScores
      scores.overall = calculateSimpleAverage(filteredScores)
    }

    // Apply industry weights if industry specified
    if (context.industry) {
      scores.overall = calculateWeightedScore(scores, context.industry)
    }

    return {
      success: true,
      scores,
      tokensUsed: response.usage?.total_tokens,
      model: MODEL,
    }
  } catch (error) {
    console.error('Scoring error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during scoring',
    }
  }
}

/**
 * Compare two sets of indicator scores (before/after)
 */
export function compareScores(
  before: IndicatorScores,
  after: IndicatorScores
): ScoreComparison {
  const improvements: IndicatorDelta[] = []
  const regressions: IndicatorDelta[] = []
  const unchanged: number[] = []

  for (let i = 1; i <= 10; i++) {
    const beforeScore = before.scores[i]?.score || 0
    const afterScore = after.scores[i]?.score || 0
    const change = afterScore - beforeScore
    const percentChange = beforeScore > 0
      ? Math.round((change / beforeScore) * 100)
      : afterScore > 0 ? 100 : 0

    const delta: IndicatorDelta = {
      indicatorNumber: i,
      indicatorName: INDICATOR_NAMES[i],
      beforeScore,
      afterScore,
      change,
      percentChange,
    }

    if (change > 0.5) {
      improvements.push(delta)
    } else if (change < -0.5) {
      regressions.push(delta)
    } else {
      unchanged.push(i)
    }
  }

  // Sort by magnitude of change
  improvements.sort((a, b) => b.change - a.change)
  regressions.sort((a, b) => a.change - b.change)

  const overallChange = after.overall - before.overall
  const overallPercentChange = before.overall > 0
    ? Math.round((overallChange / before.overall) * 100)
    : 0

  // Generate summary
  let summary = ''
  if (improvements.length > 0) {
    const topImprovement = improvements[0]
    summary += `Greatest improvement in ${topImprovement.indicatorName} (+${topImprovement.change.toFixed(1)}). `
  }
  if (regressions.length > 0) {
    const topRegression = regressions[0]
    summary += `Attention needed on ${topRegression.indicatorName} (${topRegression.change.toFixed(1)}). `
  }
  summary += `Overall score changed by ${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)} (${overallPercentChange >= 0 ? '+' : ''}${overallPercentChange}%).`

  return {
    before,
    after,
    improvements,
    regressions,
    unchanged,
    overallChange: overallPercentChange,
    overallImprovement: overallChange > 0,
    summary,
  }
}

/**
 * Generate actionable feedback for indicators below threshold
 */
export function generateFeedback(
  scores: IndicatorScores,
  threshold: number = 7
): Feedback[] {
  const feedback: Feedback[] = []

  for (const [numStr, score] of Object.entries(scores.scores)) {
    const num = parseInt(numStr)
    if (score.score < threshold) {
      feedback.push({
        indicatorNumber: num,
        indicatorName: score.indicatorName,
        currentScore: score.score,
        targetScore: threshold,
        gap: threshold - score.score,
        feedback: score.suggestion,
        actionItems: generateActionItems(num, score, scores.industry),
        examples: generateExamples(num, scores.industry),
      })
    }
  }

  // Sort by gap size (biggest gaps first)
  feedback.sort((a, b) => b.gap - a.gap)

  return feedback
}

/**
 * Generate specific action items for improving an indicator
 */
function generateActionItems(
  indicatorNumber: number,
  _score: IndicatorScore,
  _industry?: string
): string[] {
  // Industry-aware action items
  const items: Record<number, string[]> = {
    1: [ // Job Knowledge
      'Add specific certifications or credentials relevant to your field',
      'Quantify your expertise with metrics or achievements',
      'Highlight specialized training or continuing education',
      'Mention specific tools, systems, or methodologies you use',
    ],
    2: [ // Problem-Solving
      'Include a specific example of a complex problem you solved',
      'Describe your analytical process, not just the outcome',
      'Quantify the impact of your solutions',
      'Show how you identified root causes, not just symptoms',
    ],
    3: [ // Communication
      'Add examples of presentations, training, or documentation you created',
      'Mention stakeholders you regularly communicate with',
      'Include any public speaking or teaching experience',
      'Highlight cross-functional collaboration',
    ],
    4: [ // Social Skills
      'Describe team projects and your collaborative role',
      'Include conflict resolution or difficult conversation examples',
      'Mention mentoring, coaching, or supporting colleagues',
      'Show relationship-building with clients, patients, or customers',
    ],
    5: [ // Integrity
      'Highlight situations where you maintained ethical standards',
      'Include examples of accountability and ownership',
      'Mention compliance, quality assurance, or safety initiatives',
      'Show transparency in challenging situations',
    ],
    6: [ // Adaptability
      'Describe how you handled a significant change or challenge',
      'Include examples of learning new skills quickly',
      'Show resilience during difficult periods',
      'Mention successful pivots or transitions',
    ],
    7: [ // Learning Agility
      'List recent training, courses, or certifications',
      'Describe how you stay current in your field',
      'Include examples of applying feedback',
      'Show progression and growth over time',
    ],
    8: [ // Leadership
      'Highlight initiatives you started without being asked',
      'Include team guidance or mentoring examples',
      'Show strategic thinking beyond your immediate role',
      'Describe influence without formal authority',
    ],
    9: [ // Creativity
      'Include process improvements you implemented',
      'Describe novel solutions to common problems',
      'Show examples of innovation within constraints',
      'Mention new ideas that were adopted',
    ],
    10: [ // Motivation
      'Demonstrate persistence through challenges',
      'Show goal achievement with specific metrics',
      'Include long-term projects you completed',
      'Highlight going above and beyond expectations',
    ],
  }

  return items[indicatorNumber] || ['Provide more specific examples demonstrating this indicator']
}

/**
 * Generate industry-appropriate examples
 */
function generateExamples(indicatorNumber: number, industry?: string): string[] {
  const industryExamples: Record<string, Record<number, string[]>> = {
    healthcare: {
      1: ['ACLS/BLS certifications', 'EHR system proficiency', 'Specialized clinical training'],
      2: ['Patient assessment leading to early diagnosis', 'Protocol improvement reducing errors'],
      3: ['Patient education techniques', 'Interdisciplinary team communication'],
      4: ['Bedside manner and patient rapport', 'Family communication during difficult times'],
    },
    education: {
      1: ['Curriculum development', 'Assessment design', 'Subject matter expertise'],
      2: ['Differentiated instruction strategies', 'Improving student outcomes'],
      3: ['Parent-teacher communication', 'IEP meeting facilitation'],
      4: ['Classroom management', 'Student relationship building'],
    },
    retail: {
      1: ['Product knowledge', 'POS system expertise', 'Inventory management'],
      2: ['Customer complaint resolution', 'Loss prevention strategies'],
      3: ['Sales presentations', 'Team huddle facilitation'],
      4: ['Customer service excellence', 'Team collaboration'],
    },
    technology: {
      1: ['Technical stack proficiency', 'System architecture', 'Code quality'],
      2: ['Debugging complex issues', 'Performance optimization'],
      3: ['Technical documentation', 'Stakeholder presentations'],
      4: ['Cross-functional collaboration', 'Code review culture'],
    },
    finance: {
      1: ['Financial modeling', 'Regulatory compliance', 'Risk assessment'],
      2: ['Complex analysis and recommendations', 'Audit findings resolution'],
      3: ['Client advisory', 'Executive presentations'],
      4: ['Client relationship management', 'Team collaboration'],
    },
  }

  if (industry && industryExamples[industry]?.[indicatorNumber]) {
    return industryExamples[industry][indicatorNumber]
  }

  // Generic examples
  return [
    'Specific achievement with measurable outcome',
    'Challenge faced and how you addressed it',
    'Recognition or positive feedback received',
  ]
}

/**
 * Mock scoring for development/testing
 */
function getMockScores(text: string, context: ScoringContext): ScoringResult {
  const baseScore = 5 + Math.random() * 2 // 5-7 base range

  const scores: Record<number, IndicatorScore> = {}
  for (let i = 1; i <= 10; i++) {
    const variance = (Math.random() - 0.5) * 3 // ±1.5 variance
    const score = Math.min(10, Math.max(1, Math.round((baseScore + variance) * 10) / 10))

    scores[i] = {
      indicatorNumber: i,
      indicatorName: INDICATOR_NAMES[i],
      score,
      evidence: `[Mock] Evidence for ${INDICATOR_NAMES[i]} detected in text`,
      suggestion: `[Mock] Consider adding more specific examples of ${INDICATOR_NAMES[i].toLowerCase()}`,
    }
  }

  const indicatorScores: IndicatorScores = {
    scores,
    overall: calculateSimpleAverage(scores),
    strengths: [
      '[Mock] Shows potential in multiple areas',
      '[Mock] Good foundation demonstrated',
    ],
    gaps: [
      '[Mock] Could strengthen specific examples',
      '[Mock] Consider adding quantified achievements',
    ],
    industry: context.industry,
    context: context.type,
    timestamp: new Date(),
  }

  return {
    success: true,
    scores: indicatorScores,
    model: 'mock',
  }
}
