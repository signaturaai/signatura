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
