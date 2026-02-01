/**
 * Siggy PM Intelligence Module
 *
 * Core Product Management principles and frameworks to guide users
 * in framing their experience using industry-standard PM mindsets.
 *
 * Based on: awesome-pm-skills repository insights and PM best practices
 */

export interface PMPrinciple {
  id: string
  name: string
  description: string
  keyQuestions: string[]
  applicationTips: string[]
  exampleFraming: {
    weak: string
    strong: string
  }
}

export interface PMFramework {
  name: string
  description: string
  whenToUse: string
  components: string[]
}

/**
 * Core PM Mindset Principles
 * These represent the fundamental ways PMs think and approach problems
 */
export const PM_CORE_PRINCIPLES: PMPrinciple[] = [
  {
    id: 'outcome-over-output',
    name: 'Outcome Over Output',
    description: 'Focus on the business impact and user value delivered, not just features shipped',
    keyQuestions: [
      'What problem did this solve for users?',
      'What business metric did this move?',
      'How did you measure success?',
      'What was the before/after state?',
    ],
    applicationTips: [
      'Quantify the impact with metrics (e.g., "increased user retention by 25%")',
      'Connect features to business goals (e.g., "reduced churn" not "built a feature")',
      'Show the "so what?" - why did this matter to the business?',
      'Use outcome-oriented language: "enabled", "improved", "increased", "reduced"',
    ],
    exampleFraming: {
      weak: 'Built a new dashboard for analytics',
      strong:
        'Improved data-driven decision making by shipping analytics dashboard that reduced time-to-insight by 40%, enabling 15+ stakeholders to make faster product decisions',
    },
  },
  {
    id: 'data-driven-decisions',
    name: 'Data-Driven Decision Making',
    description: 'Leverage data and metrics to inform product strategy and validate assumptions',
    keyQuestions: [
      'What data informed your decision?',
      'How did you validate your hypothesis?',
      'What metrics did you track?',
      'How did you measure the experiment results?',
    ],
    applicationTips: [
      'Mention specific metrics and KPIs you tracked',
      'Describe A/B tests or experiments you ran',
      'Show how you used analytics tools to inform decisions',
      'Highlight instances where data changed your direction',
    ],
    exampleFraming: {
      weak: 'Decided to build a new feature based on feedback',
      strong:
        'Analyzed user behavior data showing 60% drop-off at checkout, ran A/B test on simplified flow, validated 23% conversion improvement before full rollout',
    },
  },
  {
    id: 'user-centricity',
    name: 'User-Centricity',
    description: 'Deeply understand user needs and pain points to drive product decisions',
    keyQuestions: [
      'Who was the user and what problem did they have?',
      'How did you gather user insights?',
      'What research methods did you use?',
      'How did user feedback shape your approach?',
    ],
    applicationTips: [
      'Specify the user persona or segment you focused on',
      'Mention research methods: interviews, surveys, usability tests',
      'Show empathy - describe the user pain point vividly',
      'Connect features back to solving real user problems',
    ],
    exampleFraming: {
      weak: 'Added a feature users requested',
      strong:
        'Conducted 12 user interviews revealing enterprise customers struggled with team collaboration, leading to a co-editing feature that addressed their #1 pain point and increased team plan adoption by 35%',
    },
  },
  {
    id: 'strategic-thinking',
    name: 'Strategic Thinking',
    description: 'Align product decisions with broader business strategy and long-term vision',
    keyQuestions: [
      'How did this align with company strategy?',
      'What was the market opportunity?',
      'What trade-offs did you make and why?',
      'How did this fit into the product roadmap?',
    ],
    applicationTips: [
      'Show how you balanced short-term wins with long-term strategy',
      'Mention competitive analysis or market research',
      'Describe prioritization frameworks you used',
      'Highlight strategic trade-offs and your reasoning',
    ],
    exampleFraming: {
      weak: 'Prioritized features for the roadmap',
      strong:
        "Prioritized mobile-first redesign using RICE framework, trading off 3 feature requests to capture growing mobile segment (40% of traffic), aligning with company's strategic shift to mobile-first product",
    },
  },
  {
    id: 'cross-functional-leadership',
    name: 'Cross-Functional Leadership',
    description:
      'Lead through influence, align stakeholders, and drive execution without formal authority',
    keyQuestions: [
      'Who did you work with across teams?',
      'How did you align stakeholders with competing priorities?',
      'How did you resolve conflicts or disagreements?',
      'How did you influence without authority?',
    ],
    applicationTips: [
      'Mention specific teams you collaborated with (eng, design, marketing, sales)',
      'Describe stakeholder management and alignment tactics',
      'Show how you navigated organizational complexity',
      'Highlight leadership moments where you drove consensus',
    ],
    exampleFraming: {
      weak: 'Worked with engineering and design teams',
      strong:
        'Led cross-functional team of 8 (eng, design, marketing) through weekly syncs and stakeholder reviews, aligned C-suite on 6-month roadmap despite competing priorities, achieving 95% on-time delivery',
    },
  },
  {
    id: 'problem-solving',
    name: 'Problem-Solving & Root Cause Analysis',
    description: 'Identify root causes, not symptoms, and solve problems systematically',
    keyQuestions: [
      'What was the underlying problem, not just the symptom?',
      'How did you diagnose the issue?',
      'What alternatives did you consider?',
      'Why did you choose this solution over others?',
    ],
    applicationTips: [
      'Use frameworks like "5 Whys" or root cause analysis',
      'Show your analytical process',
      'Mention multiple solution paths you evaluated',
      'Explain your decision-making criteria',
    ],
    exampleFraming: {
      weak: 'Fixed a bug that was causing user complaints',
      strong:
        'Diagnosed 40% support ticket increase using 5 Whys analysis, uncovered onboarding flow confusion (not bug), redesigned first-run experience reducing tickets by 55% and improving activation rate',
    },
  },
  {
    id: 'iterative-development',
    name: 'Iterative Development & MVP Mindset',
    description: 'Ship fast, learn, and iterate rather than pursuing perfection upfront',
    keyQuestions: [
      'How did you scope the MVP?',
      'What did you cut to ship faster?',
      'What did you learn from the first iteration?',
      'How did user feedback shape v2, v3, etc.?',
    ],
    applicationTips: [
      'Show how you defined an MVP and why',
      'Describe what you learned from early versions',
      'Highlight iteration cycles and improvements',
      'Emphasize speed of learning over perfection',
    ],
    exampleFraming: {
      weak: 'Launched a new feature after 6 months of development',
      strong:
        'Shipped MVP in 3 weeks (vs. 6-month full build), gathered feedback from 500 beta users, iterated twice based on usage data, achieving 70% adoption within 2 months of full launch',
    },
  },
  {
    id: 'communication-storytelling',
    name: 'Communication & Storytelling',
    description: 'Communicate vision clearly and tell compelling stories to inspire action',
    keyQuestions: [
      'How did you communicate the product vision?',
      'What story did you tell to get buy-in?',
      'How did you present to different audiences?',
      'How did you make complex ideas simple?',
    ],
    applicationTips: [
      'Mention presentations, PRDs, or roadmap communications',
      'Show how you tailored messages for different audiences',
      'Describe how you built narrative around the product',
      'Highlight moments where communication drove action',
    ],
    exampleFraming: {
      weak: 'Presented product updates to the team',
      strong:
        'Crafted product vision narrative linking feature to customer success stories, presented to board securing $2M budget, and ran monthly all-hands demos that increased eng team product understanding by 45% (survey)',
    },
  },
  {
    id: 'technical-aptitude',
    name: 'Technical Aptitude',
    description: 'Understand technical constraints and opportunities to make informed decisions',
    keyQuestions: [
      'What technical considerations influenced your decisions?',
      'How did you work with engineering on feasibility?',
      'What technical trade-offs did you navigate?',
      'How did you balance user needs with technical constraints?',
    ],
    applicationTips: [
      'Show you understand technical concepts relevant to your product',
      'Mention technical constraints you worked within',
      'Describe how you collaborated with engineering on solutions',
      'Highlight technical decisions you influenced or made',
    ],
    exampleFraming: {
      weak: 'Worked with engineers to build the feature',
      strong:
        'Partnered with eng to evaluate API vs. webhook architecture, chose webhooks for real-time needs despite 2-week implementation overhead, reducing latency from 5min to 30sec and improving user satisfaction by 40%',
    },
  },
  {
    id: 'business-acumen',
    name: 'Business Acumen',
    description: 'Understand the business model, revenue drivers, and market dynamics',
    keyQuestions: [
      'How did this impact revenue/growth/retention?',
      'What was the ROI or business case?',
      'How did you think about pricing or monetization?',
      'What market dynamics influenced your decisions?',
    ],
    applicationTips: [
      'Quantify business impact in terms of revenue, growth, or cost savings',
      'Show understanding of unit economics or business model',
      'Mention competitive dynamics or market positioning',
      'Describe how you built business cases or ROI analyses',
    ],
    exampleFraming: {
      weak: 'Launched a new pricing tier',
      strong:
        'Analyzed competitor pricing and customer willingness-to-pay, designed middle tier that captured 30% of free users, generating $450K ARR in first quarter while improving customer LTV by 25%',
    },
  },
]

/**
 * Common PM Frameworks
 * Reference frameworks that PMs use in their work
 */
export const PM_FRAMEWORKS: PMFramework[] = [
  {
    name: 'RICE Prioritization',
    description: 'Reach x Impact x Confidence / Effort',
    whenToUse: 'When prioritizing features or initiatives across a roadmap',
    components: [
      'Reach (users affected)',
      'Impact (on goal)',
      'Confidence (in estimates)',
      'Effort (person-months)',
    ],
  },
  {
    name: 'AARRR (Pirate Metrics)',
    description: 'Acquisition, Activation, Retention, Referral, Revenue',
    whenToUse: 'When measuring product funnel and growth metrics',
    components: ['Acquisition', 'Activation', 'Retention', 'Referral', 'Revenue'],
  },
  {
    name: 'Jobs-to-be-Done (JTBD)',
    description: 'Understanding what "job" users are hiring your product to do',
    whenToUse: 'When conducting user research or defining product positioning',
    components: ['Functional job', 'Emotional job', 'Social job'],
  },
  {
    name: 'OKRs (Objectives & Key Results)',
    description: 'Objectives (what) + Key Results (how to measure)',
    whenToUse: 'When setting goals and measuring success',
    components: ['Objective (qualitative goal)', 'Key Results (quantitative measures)'],
  },
  {
    name: 'North Star Metric',
    description: 'The one metric that best captures the core value you deliver',
    whenToUse: 'When aligning team around product strategy',
    components: ['Core value metric', 'Leading indicators', 'Supporting metrics'],
  },
  {
    name: 'Kano Model',
    description: 'Categorize features: Basic, Performance, Delighters',
    whenToUse: 'When deciding what features to build',
    components: [
      'Must-haves (Basic)',
      'Performance (linear satisfaction)',
      'Delighters (unexpected value)',
    ],
  },
]

/**
 * Context-specific guidance for different use cases
 */
export const PM_COACHING_CONTEXTS = {
  cvTailor: {
    primaryPrinciples: [
      'outcome-over-output',
      'data-driven-decisions',
      'user-centricity',
      'business-acumen',
    ],
    guidance: [
      'Start each bullet with a strong action verb (Led, Drove, Launched, Increased)',
      'Use the formula: Action + Method + Outcome (with metrics)',
      'Quantify everything possible - percentages, dollar amounts, user counts',
      'Show the "so what?" - connect your work to business impact',
      'Tailor achievements to match the job description keywords',
    ],
    redFlags: [
      'Listing features built without outcomes',
      'Vague responsibilities without measurable impact',
      'Missing metrics and quantification',
      'No mention of user research or data',
      'Focusing on what you did vs. what changed because of what you did',
    ],
  },

  interviewCoach: {
    primaryPrinciples: [
      'problem-solving',
      'strategic-thinking',
      'cross-functional-leadership',
      'communication-storytelling',
    ],
    guidance: [
      'Use the STAR method: Situation, Task, Action, Result',
      'Be specific - use real examples with numbers',
      'Show your thinking process, not just the outcome',
      'Highlight collaboration and stakeholder management',
      'Prepare stories that demonstrate multiple principles',
      'Always circle back to impact and learnings',
    ],
    commonQuestions: [
      'Tell me about a time you had to prioritize competing features',
      'How do you decide what to build?',
      'Describe a product you shipped from 0 to 1',
      'Tell me about a time you used data to make a decision',
      'How do you handle disagreements with engineering/design?',
      "What's your process for user research?",
    ],
    starTemplate: {
      situation: 'What was the context? What problem existed?',
      task: 'What was your goal? What were you responsible for?',
      action: 'What specific steps did you take? How did you approach it?',
      result: 'What was the outcome? What metrics improved? What did you learn?',
    },
  },
}

/**
 * Helper function to get relevant principles for a context
 */
export function getPrinciplesForContext(
  context: 'cvTailor' | 'interviewCoach'
): PMPrinciple[] {
  const contextConfig = PM_COACHING_CONTEXTS[context]
  return PM_CORE_PRINCIPLES.filter((principle) =>
    contextConfig.primaryPrinciples.includes(principle.id)
  )
}

/**
 * Helper function to analyze text and suggest improvements based on PM principles
 */
export function analyzeWithPMPrinciples(text: string): {
  missingPrinciples: PMPrinciple[]
  suggestions: string[]
  score: number
} {
  const missingPrinciples: PMPrinciple[] = []
  const suggestions: string[] = []
  let score = 0

  // Check for outcome-oriented language
  const outcomeKeywords = ['increased', 'reduced', 'improved', 'enabled', 'grew', 'decreased']
  const hasOutcomeLanguage = outcomeKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword)
  )

  if (!hasOutcomeLanguage) {
    missingPrinciples.push(PM_CORE_PRINCIPLES[0]) // outcome-over-output
    suggestions.push('Add outcome-oriented language showing the impact of your work')
  } else {
    score += 20
  }

  // Check for metrics/data
  const hasNumbers = /\d+%|\$\d+|\d+x|\d+ (users|customers|people)/.test(text)
  if (!hasNumbers) {
    missingPrinciples.push(PM_CORE_PRINCIPLES[1]) // data-driven
    suggestions.push('Quantify your impact with specific metrics and percentages')
  } else {
    score += 20
  }

  // Check for user mention
  const userKeywords = ['user', 'customer', 'client', 'people']
  const hasUserMention = userKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword)
  )

  if (!hasUserMention) {
    missingPrinciples.push(PM_CORE_PRINCIPLES[2]) // user-centricity
    suggestions.push('Mention the users or customers you served and their needs')
  } else {
    score += 20
  }

  // Check for collaboration/leadership
  const collaborationKeywords = ['led', 'collaborated', 'partnered', 'aligned', 'team']
  const hasCollaboration = collaborationKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword)
  )

  if (!hasCollaboration) {
    missingPrinciples.push(PM_CORE_PRINCIPLES[4]) // cross-functional leadership
    suggestions.push('Highlight how you worked cross-functionally and led through influence')
  } else {
    score += 20
  }

  // Check for problem-solving language
  const problemKeywords = ['problem', 'challenge', 'issue', 'solution', 'solved']
  const hasProblemSolving = problemKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword)
  )

  if (!hasProblemSolving) {
    missingPrinciples.push(PM_CORE_PRINCIPLES[5]) // problem-solving
    suggestions.push('Frame your work around the problem you solved, not just what you built')
  } else {
    score += 20
  }

  return { missingPrinciples, suggestions, score }
}

/**
 * Generate coaching prompt additions for Siggy
 * This can be appended to Siggy's system prompt based on the current context
 */
export function generateSiggyPMContext(context: 'cvTailor' | 'interviewCoach'): string {
  const contextConfig = PM_COACHING_CONTEXTS[context]
  const principles = getPrinciplesForContext(context)

  let prompt = `\n\n## Product Manager Intelligence Module\n\n`
  prompt += `You're helping the user with their ${context === 'cvTailor' ? 'CV/resume' : 'interview preparation'}. `
  prompt += `Apply these PM principles to guide them:\n\n`

  // Add primary principles
  prompt += `### Key Principles to Emphasize:\n`
  principles.forEach((principle) => {
    prompt += `\n**${principle.name}**: ${principle.description}\n`
    prompt += `Key questions to ask: ${principle.keyQuestions.join(', ')}\n`
  })

  // Add context-specific guidance
  prompt += `\n### Coaching Guidance:\n`
  contextConfig.guidance.forEach((tip) => {
    prompt += `- ${tip}\n`
  })

  if (context === 'cvTailor') {
    prompt += `\n### Red Flags to Watch For:\n`
    contextConfig.redFlags?.forEach((flag: string) => {
      prompt += `- ${flag}\n`
    })
  }

  if (context === 'interviewCoach') {
    prompt += `\n### STAR Method Template:\n`
    const star = contextConfig.starTemplate
    prompt += `- **Situation**: ${star?.situation}\n`
    prompt += `- **Task**: ${star?.task}\n`
    prompt += `- **Action**: ${star?.action}\n`
    prompt += `- **Result**: ${star?.result}\n`
  }

  prompt += `\n**Your role**: Gently nudge the user to frame their experience using these principles. `
  prompt += `Ask probing questions. Offer specific examples. Help them see the PM perspective in their work.\n`

  return prompt
}

export default {
  PM_CORE_PRINCIPLES,
  PM_FRAMEWORKS,
  PM_COACHING_CONTEXTS,
  getPrinciplesForContext,
  analyzeWithPMPrinciples,
  generateSiggyPMContext,
}
