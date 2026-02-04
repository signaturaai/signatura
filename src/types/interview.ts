/**
 * Interview Coach Types
 *
 * Types for the Interview Coach module including setup wizard,
 * plan generation, and simulation.
 */

// ==========================================
// Interview Types
// ==========================================

export type InterviewType =
  | 'hr_screening'
  | 'hiring_manager'
  | 'technical'
  | 'executive'
  | 'peer'

export type InterviewPersona =
  | 'friendly'
  | 'strict'
  | 'data_driven'
  | 'visionary'

export type FocusArea =
  | 'soft_skills'
  | 'system_design'
  | 'conflict_resolution'
  | 'live_coding'
  | 'leadership'
  | 'culture_fit'
  | 'problem_solving'
  | 'communication'

// ==========================================
// Wizard Configuration
// ==========================================

export interface InterviewTypeOption {
  value: InterviewType
  label: string
  description: string
  icon: string
  focusAreas: string[]
}

export interface PersonaOption {
  value: InterviewPersona
  label: string
  description: string
  traits: string[]
}

export interface FocusAreaOption {
  value: FocusArea
  label: string
  description: string
}

export interface WizardConfig {
  // Step 1: Type
  interviewType: InterviewType

  // Step 2: Interviewer
  personaMode: 'preset' | 'analyze'
  persona?: InterviewPersona
  linkedInText?: string
  interviewerName?: string

  // Step 3: Focus & Strategy
  focusAreas: FocusArea[]
  anxieties: string
}

// ==========================================
// Generated Interview Plan
// ==========================================

export interface InterviewQuestion {
  id: string
  question: string
  category: 'standard' | 'tailored' | 'persona'
  hiddenAgenda: string
  suggestedStructure: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeEstimate: string
  relatedCVSection?: string
  keywords?: string[]
}

export interface InterviewerProfile {
  name: string
  inferredStyle: string
  communicationPreferences: string[]
  likelyPriorities: string[]
  potentialBiases: string[]
  derivedFrom: 'linkedin_analysis' | 'preset_persona'
}

export interface InterviewPlan {
  id: string
  applicationId?: string
  userId: string

  // Configuration
  config: WizardConfig

  // Generated Content
  interviewerProfile: InterviewerProfile
  strategyBrief: string
  keyTactics: string[]
  questions: InterviewQuestion[]

  // Metadata
  generatedAt: string
  expiresAt?: string
  regenerationCount: number
}

// ==========================================
// API Types
// ==========================================

export interface GeneratePlanRequest {
  jobDescription: string
  tailoredCV: string
  companyName?: string
  positionTitle?: string
  applicationId?: string
  config: WizardConfig
}

export interface GeneratePlanResponse {
  success: boolean
  plan?: InterviewPlan
  error?: string
}

// ==========================================
// UI State Types
// ==========================================

export interface WizardStep {
  id: number
  title: string
  description: string
  isCompleted: boolean
  isCurrent: boolean
}

export interface InterviewCoachState {
  mode: 'wizard' | 'dashboard' | 'simulation'
  currentPlan: InterviewPlan | null
  isLoading: boolean
  error: string | null
}

// ==========================================
// Constants
// ==========================================

export const INTERVIEW_TYPES: InterviewTypeOption[] = [
  {
    value: 'hr_screening',
    label: 'HR Screening',
    description: 'Culture fit & basic qualifications',
    icon: 'Users',
    focusAreas: ['Culture', 'Basic qualifications', 'Salary expectations'],
  },
  {
    value: 'hiring_manager',
    label: 'Hiring Manager',
    description: 'Operational fit & team dynamics',
    icon: 'Briefcase',
    focusAreas: ['Day-to-day responsibilities', 'Team collaboration', 'Management style'],
  },
  {
    value: 'technical',
    label: 'Technical/Skills',
    description: 'Hard skills & technical depth',
    icon: 'Code',
    focusAreas: ['Technical proficiency', 'Problem-solving', 'System design'],
  },
  {
    value: 'executive',
    label: 'Executive',
    description: 'Vision, strategy & ROI',
    icon: 'TrendingUp',
    focusAreas: ['Strategic thinking', 'Business impact', 'Leadership vision'],
  },
  {
    value: 'peer',
    label: 'Peer Interview',
    description: 'Collaboration & team fit',
    icon: 'UserPlus',
    focusAreas: ['Collaboration style', 'Communication', 'Team dynamics'],
  },
]

export const PERSONA_OPTIONS: PersonaOption[] = [
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm, conversational, puts you at ease',
    traits: ['Encouraging', 'Conversational', 'Patient'],
  },
  {
    value: 'strict',
    label: 'Strict/Skeptical',
    description: 'Challenges your answers, probes deeply',
    traits: ['Challenging', 'Detail-oriented', 'Skeptical'],
  },
  {
    value: 'data_driven',
    label: 'Data-Driven',
    description: 'Wants metrics, numbers, and evidence',
    traits: ['Analytical', 'Quantitative', 'Evidence-based'],
  },
  {
    value: 'visionary',
    label: 'Abstract/Visionary',
    description: 'Big picture thinker, asks about vision',
    traits: ['Strategic', 'Conceptual', 'Future-focused'],
  },
]

export const FOCUS_AREAS: FocusAreaOption[] = [
  {
    value: 'soft_skills',
    label: 'Soft Skills',
    description: 'Communication, teamwork, adaptability',
  },
  {
    value: 'system_design',
    label: 'System Design',
    description: 'Architecture, scalability, trade-offs',
  },
  {
    value: 'conflict_resolution',
    label: 'Conflict Resolution',
    description: 'Handling disagreements, difficult situations',
  },
  {
    value: 'live_coding',
    label: 'Live Coding',
    description: 'Coding exercises, algorithm challenges',
  },
  {
    value: 'leadership',
    label: 'Leadership',
    description: 'Leading teams, decision-making, influence',
  },
  {
    value: 'culture_fit',
    label: 'Culture Fit',
    description: 'Values alignment, work style preferences',
  },
  {
    value: 'problem_solving',
    label: 'Problem Solving',
    description: 'Analytical thinking, creative solutions',
  },
  {
    value: 'communication',
    label: 'Communication',
    description: 'Presenting ideas, stakeholder management',
  },
]

// ==========================================
// Strategic Interview Wizard Types
// ==========================================

export type DifficultyLevel = 'entry' | 'standard' | 'senior' | 'executive'
export type InterviewMode = 'conversational' | 'traditional'
export type AnswerFormat = 'text' | 'voice'

/** Interviewer personality sliders (0-100 scale) */
export interface InterviewerPersonality {
  warmth: number
  directness: number
  intensity: number
  technicalDepth: number
  paceSpeed: number
}

/** Values extracted from a LinkedIn profile or user-provided bio */
export interface InterviewerValues {
  inferredPriorities: string[]
  communicationStyle: string
  likelyQuestionThemes: string[]
  culturalSignals: string[]
  rawText: string
}

/** Full strategic wizard configuration */
export interface StrategicWizardConfig {
  // Step 1: Basics
  interviewType: InterviewType
  difficultyLevel: DifficultyLevel

  // Step 2: Personality
  personality: InterviewerPersonality

  // Step 3: Mode
  interviewMode: InterviewMode
  answerFormat: AnswerFormat

  // Step 4: External Intelligence
  userEmphases: string
  interviewerLinkedIn: string
  extractedValues: InterviewerValues | null
}

/** Prepared session returned by the thinking engine */
export interface PreparedInterviewSession {
  config: StrategicWizardConfig
  narrativeAnchors: string[]
  prioritizedQuestionThemes: string[]
  gapHuntingTargets: string[]
  scoringMode: 'content_only' | 'content_and_delivery'
  sessionBrief: string
}

export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: 'entry', label: 'Entry Level', description: 'Foundational questions, supportive tone' },
  { value: 'standard', label: 'Standard', description: 'Balanced depth and breadth' },
  { value: 'senior', label: 'Senior', description: 'Deep probes, expectation of leadership evidence' },
  { value: 'executive', label: 'Executive', description: 'C-suite style, vision and impact focused' },
]

export const DEFAULT_PERSONALITY: InterviewerPersonality = {
  warmth: 60,
  directness: 50,
  intensity: 40,
  technicalDepth: 50,
  paceSpeed: 50,
}

// ==========================================
// Interview Arena & Interaction Engine Types
// ==========================================

export type InterviewerVisualState = 'thinking' | 'speaking' | 'listening' | 'idle'

export type HunterAction = 'drill_down' | 'challenge' | 'pivot' | 'acknowledge'

/** A single message in the interview dialogue */
export interface ArenaMessage {
  id: string
  role: 'interviewer' | 'candidate'
  content: string
  timestamp: Date
  /** For interviewer messages — what visual state to show */
  visualState?: InterviewerVisualState
  /** For candidate messages — delivery metadata */
  delivery?: DeliveryMetrics
  /** Hunter Logic analysis attached to interviewer follow-ups */
  hunterAnalysis?: HunterAnalysis
}

/** Real-time delivery metrics captured during candidate responses */
export interface DeliveryMetrics {
  /** Words per minute — pacing indicator */
  wordsPerMinute: number
  /** Confidence score 0-100 based on filler words, hedging, etc. */
  confidenceScore: number
  /** Detected tone: assertive, tentative, analytical, storytelling */
  detectedTone: 'assertive' | 'tentative' | 'analytical' | 'storytelling'
  /** Duration of response in seconds */
  durationSeconds: number
  /** Filler word count (um, uh, like, you know) */
  fillerWordCount: number
}

/** Hunter Logic: real-time analysis of candidate responses */
export interface HunterAnalysis {
  /** Keywords from the response that match JD/narrative */
  matchedKeywords: string[]
  /** Expected keywords that were missing */
  missingKeywords: string[]
  /** Detected seniority level in the response */
  detectedSeniority: SeniorityLevel | 'unknown'
  /** Required seniority level for the role */
  requiredSeniority: SeniorityLevel
  /** Whether a gap was detected between response and expectations */
  gapDetected: boolean
  /** Specific gap description if detected */
  gapDescription: string
  /** The chosen follow-up action */
  action: HunterAction
  /** Reason for the chosen action */
  actionReason: string
  /** Score for this response (0-100) */
  responseScore: number
}

/** Character guardrails to keep interviewer persona consistent */
export interface CharacterGuardrails {
  /** Persona tone keywords to maintain */
  toneKeywords: string[]
  /** Maximum follow-up drill-downs before pivoting */
  maxDrillDowns: number
  /** Whether to show empathy acknowledgments */
  showEmpathy: boolean
  /** How aggressively to challenge weak answers (0-100) */
  challengeIntensity: number
  /** Persona-specific question prefixes */
  questionPrefixes: string[]
}

/** Full arena session state */
export interface ArenaSessionState {
  /** The prepared session from the wizard */
  session: PreparedInterviewSession
  /** Current question index */
  currentQuestionIndex: number
  /** All dialogue messages */
  messages: ArenaMessage[]
  /** Current visual state of the interviewer avatar */
  avatarState: InterviewerVisualState
  /** Whether the session is active */
  isActive: boolean
  /** Consecutive drill-downs on current topic */
  drillDownCount: number
  /** Running average response score */
  averageScore: number
  /** Character guardrails for the session */
  guardrails: CharacterGuardrails
  /** Total questions planned */
  totalQuestions: number
}

/** Arena question — extends InterviewQuestion with arena-specific fields */
export interface ArenaQuestion {
  id: string
  question: string
  category: 'opening' | 'technical' | 'behavioral' | 'situational' | 'closing'
  targetKeywords: string[]
  expectedSeniority: SeniorityLevel
  difficulty: 'easy' | 'medium' | 'hard'
  maxFollowUps: number
}

/** Follow-up question generated by Hunter Logic */
export interface HunterFollowUp {
  question: string
  action: HunterAction
  reason: string
  targetGap: string
}

/** Voice metadata for delivery tracking */
export interface VoiceMetadata {
  rawText: string
  wordCount: number
  sentenceCount: number
  avgWordsPerSentence: number
  fillerWords: string[]
  hedgingPhrases: string[]
  powerWords: string[]
  quantifiedResults: string[]
}

// ==========================================
// Arena Constants
// ==========================================

/** Filler words that reduce confidence score */
export const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'actually',
  'sort of', 'kind of', 'i guess', 'i think', 'maybe',
  'i mean', 'right', 'so yeah',
]

/** Hedging phrases that signal low confidence */
export const HEDGING_PHRASES = [
  'i\'m not sure', 'i don\'t know', 'it depends', 'possibly',
  'perhaps', 'might be', 'could be', 'to be honest',
  'i would say', 'in my opinion', 'i believe',
]

/** Power words that signal seniority and confidence */
export const POWER_WORDS = [
  'led', 'drove', 'spearheaded', 'architected', 'transformed',
  'delivered', 'achieved', 'accelerated', 'scaled', 'pioneered',
  'established', 'launched', 'orchestrated', 'championed', 'mentored',
  'negotiated', 'optimized', 'streamlined', 'innovated', 'influenced',
]

/** Seniority signal keywords by level */
export const SENIORITY_SIGNALS: Record<string, string[]> = {
  'entry-level': ['learned', 'assisted', 'helped', 'supported', 'participated', 'contributed'],
  'mid-level': ['managed', 'implemented', 'developed', 'coordinated', 'improved', 'designed'],
  'senior': ['led', 'architected', 'mentored', 'drove', 'defined', 'established', 'owned'],
  'executive': ['transformed', 'scaled', 'pioneered', 'influenced', 'championed', 'shaped', 'envisioned'],
}

/** Persona-specific guardrail presets */
export const PERSONA_GUARDRAILS: Record<string, Omit<CharacterGuardrails, 'challengeIntensity'>> = {
  friendly: {
    toneKeywords: ['great', 'interesting', 'tell me more', 'appreciate', 'wonderful'],
    maxDrillDowns: 2,
    showEmpathy: true,
    questionPrefixes: ['I\'d love to hear about', 'Can you share', 'That\'s interesting,'],
  },
  strict: {
    toneKeywords: ['specifically', 'exactly', 'quantify', 'evidence', 'prove'],
    maxDrillDowns: 4,
    showEmpathy: false,
    questionPrefixes: ['Be specific:', 'Walk me through exactly', 'What evidence shows'],
  },
  data_driven: {
    toneKeywords: ['metrics', 'data', 'numbers', 'measured', 'quantified'],
    maxDrillDowns: 3,
    showEmpathy: false,
    questionPrefixes: ['What metrics showed', 'How did you measure', 'Quantify the impact of'],
  },
  visionary: {
    toneKeywords: ['vision', 'future', 'strategy', 'innovation', 'long-term'],
    maxDrillDowns: 2,
    showEmpathy: true,
    questionPrefixes: ['How does this align with', 'What\'s your vision for', 'Thinking bigger,'],
  },
}

