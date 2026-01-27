/**
 * Interview Plan Generator
 *
 * Generates personalized interview plans with:
 * - LinkedIn profile analysis (killer feature)
 * - Interviewer persona profiling
 * - Tailored questions based on CV
 * - Hidden agenda explanations
 */

import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import type {
  InterviewPlan,
  InterviewQuestion,
  InterviewerProfile,
  GeneratePlanRequest,
} from '@/types/interview'
import { INTERVIEW_TYPES as TYPES } from '@/types/interview'

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

// ==========================================
// LinkedIn Profile Analysis
// ==========================================

interface LinkedInAnalysis {
  name: string
  inferredStyle: string
  communicationPreferences: string[]
  likelyPriorities: string[]
  potentialBiases: string[]
  questioningApproach: string
  decisionMakingStyle: string
}

async function analyzeLinkedInProfile(
  linkedInText: string,
  interviewerName?: string
): Promise<LinkedInAnalysis> {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert interviewer profiler. Analyze the LinkedIn bio/about text to deduce the interviewer's personality, communication style, and likely interview approach.

Output JSON only:
{
  "name": "string (use provided name or infer from text or use 'Your Interviewer')",
  "inferredStyle": "string (e.g., 'Data-Driven Leader', 'People-First Manager', 'Technical Perfectionist')",
  "communicationPreferences": ["array of 3-4 preferences, e.g., 'Values brevity and directness', 'Appreciates data-backed claims'"],
  "likelyPriorities": ["array of 3-4 priorities they likely care about, e.g., 'Team collaboration', 'Measurable outcomes'"],
  "potentialBiases": ["array of 2-3 potential biases to watch for, e.g., 'May favor candidates from similar background', 'Might undervalue soft skills'"],
  "questioningApproach": "string describing how they likely ask questions",
  "decisionMakingStyle": "string describing how they likely make hiring decisions"
}

Analyze writing patterns:
- Formal vs casual language
- Focus on metrics vs relationships
- Technical depth vs business focus
- Past achievements vs future vision
- Individual accomplishments vs team emphasis`,
      },
      {
        role: 'user',
        content: `Interviewer Name: ${interviewerName || 'Unknown'}

LinkedIn Bio/About:
${linkedInText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower temperature for consistent analysis
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')

  return {
    name: result.name || interviewerName || 'Your Interviewer',
    inferredStyle: result.inferredStyle || 'Professional',
    communicationPreferences: result.communicationPreferences || ['Clear communication'],
    likelyPriorities: result.likelyPriorities || ['Technical competence'],
    potentialBiases: result.potentialBiases || [],
    questioningApproach: result.questioningApproach || 'Standard questioning',
    decisionMakingStyle: result.decisionMakingStyle || 'Balanced approach',
  }
}

function getPresetPersonaProfile(persona: string): InterviewerProfile {
  const profiles: Record<string, InterviewerProfile> = {
    friendly: {
      name: 'Your Interviewer',
      inferredStyle: 'Warm & Conversational',
      communicationPreferences: [
        'Prefers casual, conversational tone',
        'Values authenticity over perfection',
        'Appreciates personal anecdotes',
        'Enjoys building rapport first',
      ],
      likelyPriorities: [
        'Cultural fit and team dynamics',
        'Growth potential and learning ability',
        'Interpersonal skills',
      ],
      potentialBiases: [
        'May prioritize likability over technical depth',
        'Could be swayed by good rapport',
      ],
      derivedFrom: 'preset_persona',
    },
    strict: {
      name: 'Your Interviewer',
      inferredStyle: 'Skeptical & Thorough',
      communicationPreferences: [
        'Expects precise, detailed answers',
        'Will challenge vague statements',
        'Values evidence and examples',
        'Prefers structured responses',
      ],
      likelyPriorities: [
        'Technical accuracy and depth',
        'Attention to detail',
        'Ability to handle pressure',
      ],
      potentialBiases: [
        'May undervalue creative thinking',
        'Could be dismissive of unconventional backgrounds',
      ],
      derivedFrom: 'preset_persona',
    },
    data_driven: {
      name: 'Your Interviewer',
      inferredStyle: 'Analytical & Metrics-Focused',
      communicationPreferences: [
        'Loves numbers and quantifiable results',
        'Appreciates ROI and impact metrics',
        'Values logical, structured thinking',
        'Expects data to back up claims',
      ],
      likelyPriorities: [
        'Measurable achievements and outcomes',
        'Analytical problem-solving ability',
        'Business impact and efficiency',
      ],
      potentialBiases: [
        'May undervalue qualitative contributions',
        'Could dismiss soft skills importance',
      ],
      derivedFrom: 'preset_persona',
    },
    visionary: {
      name: 'Your Interviewer',
      inferredStyle: 'Strategic & Big-Picture',
      communicationPreferences: [
        'Thinks in terms of future possibilities',
        'Appreciates innovative ideas',
        'Values strategic thinking over tactics',
        'Enjoys discussing industry trends',
      ],
      likelyPriorities: [
        'Vision alignment and strategic fit',
        'Innovation and creativity',
        'Long-term potential over immediate skills',
      ],
      potentialBiases: [
        'May overlook execution details',
        'Could favor candidates who share their vision',
      ],
      derivedFrom: 'preset_persona',
    },
  }

  return profiles[persona] || profiles.friendly
}

// ==========================================
// Interview Plan Generation
// ==========================================

const INTERVIEW_PLAN_SYSTEM_PROMPT = `You are an expert Interview Coach.

**Phase 1: Profiling.**
If LinkedIn bio text is provided, use the pre-analyzed interviewer profile.
If not, use the preset persona characteristics.

**Phase 2: Generation.**
Generate a **Personalized Interview Plan** JSON:

{
  "strategyBrief": "2-3 sentences on how to win over THIS specific interviewer (e.g., 'This person values brevity and metrics. Be direct.')",
  "keyTactics": ["array of 3-5 specific tactics to use during the interview"],
  "questions": [
    {
      "id": "unique-id",
      "question": "The actual interview question",
      "category": "standard|tailored|persona",
      "hiddenAgenda": "What they're REALLY asking (the subtext)",
      "suggestedStructure": "STAR format suggestion for answering",
      "difficulty": "easy|medium|hard",
      "timeEstimate": "2-3 min",
      "relatedCVSection": "Optional: which CV section this relates to",
      "keywords": ["array", "of", "keywords", "to", "include"]
    }
  ]
}

**Question Mix (10 questions total):**
- 3-4 Standard questions for the interview type
- 3-4 Tailored Challenges targeting the new/notable bullets in the Tailored CV
- 2-3 Persona Questions reflecting the interviewer's specific interests

**Hidden Agenda Examples:**
- "Tell me about yourself" → Testing: communication skills, self-awareness, what you prioritize
- "Why did you leave your last job?" → Testing: honesty, red flags, professional maturity
- "Describe a failure" → Testing: self-awareness, growth mindset, accountability

**STAR Structure Suggestions:**
- Situation: Set the scene (1-2 sentences)
- Task: Your responsibility (1 sentence)
- Action: What YOU did specifically (2-3 sentences, use "I" not "we")
- Result: Quantifiable outcome + learning (1-2 sentences)`

export async function generateInterviewPlan(
  request: GeneratePlanRequest
): Promise<InterviewPlan> {
  const { jobDescription, tailoredCV, config, companyName, positionTitle, applicationId } = request

  // Step 1: Get interviewer profile
  let interviewerProfile: InterviewerProfile

  if (config.personaMode === 'analyze' && config.linkedInText) {
    // Analyze LinkedIn profile
    const analysis = await analyzeLinkedInProfile(
      config.linkedInText,
      config.interviewerName
    )
    interviewerProfile = {
      name: analysis.name,
      inferredStyle: analysis.inferredStyle,
      communicationPreferences: analysis.communicationPreferences,
      likelyPriorities: analysis.likelyPriorities,
      potentialBiases: analysis.potentialBiases,
      derivedFrom: 'linkedin_analysis',
    }
  } else {
    // Use preset persona
    interviewerProfile = getPresetPersonaProfile(config.persona || 'friendly')
  }

  // Step 2: Get interview type details
  const interviewType = TYPES.find(t => t.value === config.interviewType)

  // Step 3: Generate the interview plan
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: INTERVIEW_PLAN_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Generate an interview plan with the following context:

**Interview Type:** ${interviewType?.label || config.interviewType}
Focus areas for this type: ${interviewType?.focusAreas.join(', ')}

**Interviewer Profile:**
- Name: ${interviewerProfile.name}
- Style: ${interviewerProfile.inferredStyle}
- Communication Preferences: ${interviewerProfile.communicationPreferences.join('; ')}
- Likely Priorities: ${interviewerProfile.likelyPriorities.join('; ')}
- Derived from: ${interviewerProfile.derivedFrom}

**Selected Focus Areas:** ${config.focusAreas.join(', ')}

**Candidate's Specific Anxieties/Topics to Drill:**
${config.anxieties || 'None specified'}

**Job Description:**
${jobDescription}

**Company:** ${companyName || 'Not specified'}
**Position:** ${positionTitle || 'Not specified'}

**Tailored CV (focus on new/notable bullets for tailored questions):**
${tailoredCV}

Generate exactly 10 questions with a good mix of standard, tailored, and persona-based questions.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')

  // Ensure questions have IDs
  const questions: InterviewQuestion[] = (result.questions || []).map(
    (q: Partial<InterviewQuestion>, index: number) => ({
      id: q.id || randomUUID(),
      question: q.question || `Question ${index + 1}`,
      category: q.category || 'standard',
      hiddenAgenda: q.hiddenAgenda || 'Assess your qualifications',
      suggestedStructure: q.suggestedStructure || 'Use STAR format',
      difficulty: q.difficulty || 'medium',
      timeEstimate: q.timeEstimate || '2-3 min',
      relatedCVSection: q.relatedCVSection,
      keywords: q.keywords || [],
    })
  )

  // Build the final plan
  const plan: InterviewPlan = {
    id: randomUUID(),
    applicationId,
    userId: '', // Will be set by the API route
    config,
    interviewerProfile,
    strategyBrief:
      result.strategyBrief ||
      `Prepare to engage with a ${interviewerProfile.inferredStyle} interviewer. Focus on ${interviewerProfile.likelyPriorities[0]?.toLowerCase() || 'your key strengths'}.`,
    keyTactics: result.keyTactics || [
      'Be concise and specific',
      'Use concrete examples',
      'Ask thoughtful questions',
    ],
    questions,
    generatedAt: new Date().toISOString(),
    regenerationCount: 0,
  }

  return plan
}

// ==========================================
// Mock Generation (for development)
// ==========================================

export async function getMockInterviewPlan(
  request: GeneratePlanRequest
): Promise<InterviewPlan> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  const interviewerProfile: InterviewerProfile =
    request.config.personaMode === 'analyze'
      ? {
          name: request.config.interviewerName || 'Sarah Chen',
          inferredStyle: 'Data-Driven Technical Leader',
          communicationPreferences: [
            'Values brevity and directness',
            'Appreciates data-backed claims',
            'Prefers structured responses',
            'Respects candidates who ask smart questions',
          ],
          likelyPriorities: [
            'Technical depth and accuracy',
            'Problem-solving approach',
            'Team collaboration skills',
          ],
          potentialBiases: [
            'May favor candidates with similar technical background',
            'Could undervalue soft skills initially',
          ],
          derivedFrom: 'linkedin_analysis',
        }
      : getPresetPersonaProfile(request.config.persona || 'friendly')

  const questions: InterviewQuestion[] = [
    {
      id: randomUUID(),
      question: 'Tell me about yourself and what brings you to this role.',
      category: 'standard',
      hiddenAgenda:
        "Testing: Communication skills, self-awareness, and whether you've done your research on the role.",
      suggestedStructure:
        'Situation: Current professional status\nTask: Career direction and goals\nAction: Why this specific role aligns with your trajectory\nResult: What you hope to achieve here',
      difficulty: 'easy',
      timeEstimate: '2-3 min',
    },
    {
      id: randomUUID(),
      question: 'Walk me through a complex project where you had to make difficult technical decisions.',
      category: 'tailored',
      hiddenAgenda:
        'Testing: Technical depth, decision-making process, and ability to handle ambiguity.',
      suggestedStructure:
        'Situation: Project context and constraints\nTask: The decision you needed to make\nAction: Your analysis process and final choice\nResult: Outcome and lessons learned',
      difficulty: 'hard',
      timeEstimate: '4-5 min',
      relatedCVSection: 'Recent project experience',
      keywords: ['trade-offs', 'scalability', 'architecture'],
    },
    {
      id: randomUUID(),
      question: 'How do you stay current with industry trends and new technologies?',
      category: 'persona',
      hiddenAgenda:
        'Testing: Growth mindset, intellectual curiosity, and commitment to continuous learning.',
      suggestedStructure:
        'Situation: Your learning routine\nTask: Staying relevant in a fast-moving field\nAction: Specific resources, communities, or practices\nResult: Recent example of applying new knowledge',
      difficulty: 'easy',
      timeEstimate: '2 min',
      keywords: ['continuous learning', 'adaptability', 'curiosity'],
    },
    {
      id: randomUUID(),
      question: 'Describe a time when you disagreed with a colleague or manager. How did you handle it?',
      category: 'standard',
      hiddenAgenda:
        'Testing: Conflict resolution, professionalism, and ability to navigate difficult conversations.',
      suggestedStructure:
        "Situation: The disagreement context\nTask: Why it was important to address\nAction: How you approached the conversation\nResult: Resolution and relationship outcome (don't badmouth anyone)",
      difficulty: 'medium',
      timeEstimate: '3 min',
      keywords: ['collaboration', 'professional maturity', 'communication'],
    },
    {
      id: randomUUID(),
      question: "Looking at your recent work, I see you've focused on [CV highlight]. Can you elaborate on your specific contributions?",
      category: 'tailored',
      hiddenAgenda:
        'Testing: Honesty about contributions, technical depth, and ability to articulate impact.',
      suggestedStructure:
        'Situation: Project/initiative overview\nTask: Your specific role and responsibilities\nAction: Your individual contributions (use "I" not "we")\nResult: Measurable outcomes and team impact',
      difficulty: 'medium',
      timeEstimate: '3-4 min',
      relatedCVSection: 'Key achievements',
      keywords: ['ownership', 'impact', 'leadership'],
    },
    {
      id: randomUUID(),
      question: 'What metrics do you use to measure success in your work?',
      category: 'persona',
      hiddenAgenda:
        'Testing: Results orientation, analytical thinking, and alignment with data-driven culture.',
      suggestedStructure:
        'Situation: Your approach to measurement\nTask: Defining success criteria\nAction: Specific metrics and tracking methods\nResult: Example of using data to improve outcomes',
      difficulty: 'medium',
      timeEstimate: '2-3 min',
      keywords: ['metrics', 'KPIs', 'data-driven', 'outcomes'],
    },
    {
      id: randomUUID(),
      question: 'Tell me about a time when a project failed or had significant setbacks. What happened?',
      category: 'standard',
      hiddenAgenda:
        'Testing: Self-awareness, accountability, resilience, and learning ability.',
      suggestedStructure:
        "Situation: Project context and what went wrong\nTask: Your role in the situation\nAction: How you responded and what you learned\nResult: How you've applied those lessons since",
      difficulty: 'hard',
      timeEstimate: '3-4 min',
      keywords: ['accountability', 'resilience', 'growth mindset'],
    },
    {
      id: randomUUID(),
      question: 'How would you approach ramping up in this role during the first 90 days?',
      category: 'tailored',
      hiddenAgenda:
        'Testing: Planning ability, proactiveness, and understanding of the role requirements.',
      suggestedStructure:
        'Situation: Starting a new role\nTask: Getting up to speed effectively\nAction: Your 30/60/90 day approach\nResult: Early wins and relationship building',
      difficulty: 'medium',
      timeEstimate: '3 min',
      keywords: ['onboarding', 'proactive', 'strategic thinking'],
    },
    {
      id: randomUUID(),
      question: 'What questions do you have for me about the team or role?',
      category: 'standard',
      hiddenAgenda:
        "Testing: Genuine interest, preparation, and whether you're evaluating fit on your end too.",
      suggestedStructure:
        "Prepare 3-5 thoughtful questions about:\n- Team dynamics and collaboration\n- Success metrics for the role\n- Challenges they're currently facing\n- Growth opportunities",
      difficulty: 'easy',
      timeEstimate: '5 min',
      keywords: ['engagement', 'curiosity', 'mutual evaluation'],
    },
    {
      id: randomUUID(),
      question: 'Why are you looking to leave your current position / what happened with your previous role?',
      category: 'persona',
      hiddenAgenda:
        'Testing: Honesty, professional maturity, and whether there are any red flags.',
      suggestedStructure:
        "Situation: Your current/past situation\nTask: Being honest without negativity\nAction: Frame it positively around growth\nResult: Why this opportunity is the right next step (don't badmouth previous employers)",
      difficulty: 'medium',
      timeEstimate: '2 min',
      keywords: ['growth', 'opportunity', 'professional development'],
    },
  ]

  return {
    id: randomUUID(),
    applicationId: request.applicationId,
    userId: '',
    config: request.config,
    interviewerProfile,
    strategyBrief:
      'This interviewer values data-driven decisions and technical depth. Be direct, use specific metrics and examples, and come prepared with thoughtful questions. They respect candidates who can articulate their thought process clearly.',
    keyTactics: [
      'Lead with metrics and quantifiable results when possible',
      "Use the STAR format but emphasize the 'Result' with concrete numbers",
      'Be concise - they value brevity over lengthy explanations',
      "Prepare questions that show you've researched the company and team",
      "Don't be afraid to say 'I don't know' - follow with how you'd find out",
    ],
    questions,
    generatedAt: new Date().toISOString(),
    regenerationCount: 0,
  }
}

export default generateInterviewPlan
