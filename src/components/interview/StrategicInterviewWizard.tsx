'use client'

/**
 * Strategic Interview Wizard — 4-Step Setup
 *
 * Step 1: Basics — Interview Type + Difficulty Level
 * Step 2: The Personality — Interviewer persona sliders (Warmth, Directness, etc.)
 * Step 3: Mode Selection — Conversational vs Traditional, answer format
 * Step 4: External Intelligence — User emphases + LinkedIn values extraction
 *
 * Uses framer-motion for directional slide transitions.
 * Narrative profile is pulled from context as the "North Star".
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  Button,
  Label,
  Textarea,
  Input,
} from '@/components/ui'
import {
  Users,
  Briefcase,
  Code,
  TrendingUp,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  Mic,
  MessageSquare,
  Video,
  FileText,
  Linkedin,
  Target,
  Zap,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  extractInterviewerValues,
} from '@/lib/ai/siggy-integration-guide'
import {
  INTERVIEW_TYPES,
  DIFFICULTY_LEVELS,
  DEFAULT_PERSONALITY,
  type InterviewType,
  type DifficultyLevel,
  type InterviewMode,
  type AnswerFormat,
  type InterviewerPersonality,
  type InterviewerValues,
  type StrategicWizardConfig,
} from '@/types/interview'

// ---------------------------------------------------------------------------
// Props & Constants
// ---------------------------------------------------------------------------

export interface StrategicInterviewWizardProps {
  onComplete: (config: StrategicWizardConfig) => void
  onCancel?: () => void
  className?: string
}

const STEPS = [
  { id: 1, title: 'Basics', description: 'Type & difficulty', icon: Target },
  { id: 2, title: 'The Personality', description: 'Interviewer traits', icon: Users },
  { id: 3, title: 'Mode', description: 'How you will practice', icon: Video },
  { id: 4, title: 'Intelligence', description: 'Your unfair advantage', icon: Zap },
]

const TYPE_ICONS: Record<string, typeof Users> = {
  Users,
  Briefcase,
  Code,
  TrendingUp,
  UserPlus,
}

const PERSONALITY_SLIDERS: {
  key: keyof InterviewerPersonality
  label: string
  lowLabel: string
  highLabel: string
  description: string
}[] = [
  {
    key: 'warmth',
    label: 'Warmth',
    lowLabel: 'Formal',
    highLabel: 'Warm',
    description: 'How approachable the interviewer feels',
  },
  {
    key: 'directness',
    label: 'Directness',
    lowLabel: 'Indirect',
    highLabel: 'Blunt',
    description: 'How directly they challenge your answers',
  },
  {
    key: 'intensity',
    label: 'Intensity',
    lowLabel: 'Relaxed',
    highLabel: 'Intense',
    description: 'Overall pressure level of the interview',
  },
  {
    key: 'technicalDepth',
    label: 'Technical Depth',
    lowLabel: 'Surface',
    highLabel: 'Deep',
    description: 'How deeply they probe technical details',
  },
  {
    key: 'paceSpeed',
    label: 'Pace',
    lowLabel: 'Measured',
    highLabel: 'Rapid',
    description: 'Speed of question delivery and follow-ups',
  },
]

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 250 : -250,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 250 : -250,
    opacity: 0,
  }),
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single personality slider */
function PersonalitySlider({
  config,
  slider,
  onChange,
}: {
  config: InterviewerPersonality
  slider: typeof PERSONALITY_SLIDERS[0]
  onChange: (key: keyof InterviewerPersonality, value: number) => void
}) {
  const value = config[slider.key]

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-gray-700">{slider.label}</Label>
        <span className="text-xs font-bold text-rose-600 tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={e => onChange(slider.key, Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-rose"
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{slider.lowLabel}</span>
        <span>{slider.highLabel}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StrategicInterviewWizard({
  onComplete,
  onCancel,
  className,
}: StrategicInterviewWizardProps) {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  // Step 1: Basics
  const [interviewType, setInterviewType] = useState<InterviewType | null>(null)
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('standard')

  // Step 2: Personality
  const [personality, setPersonality] = useState<InterviewerPersonality>({ ...DEFAULT_PERSONALITY })

  // Step 3: Mode
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('traditional')
  const [answerFormat, setAnswerFormat] = useState<AnswerFormat>('text')

  // Step 4: External Intelligence
  const [userEmphases, setUserEmphases] = useState('')
  const [linkedInText, setLinkedInText] = useState('')
  const [extractedValues, setExtractedValues] = useState<InterviewerValues | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  // Navigation
  const canProceed = useCallback(() => {
    switch (step) {
      case 1: return interviewType !== null
      case 2: return true // personality has defaults
      case 3: return true // mode has defaults
      case 4: return true // emphases & linkedin are optional
      default: return false
    }
  }, [step, interviewType])

  const handleNext = () => {
    if (!canProceed()) return
    if (step < 4) {
      setDirection(1)
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1)
      setStep(step - 1)
    } else if (onCancel) {
      onCancel()
    }
  }

  const handlePersonalityChange = (key: keyof InterviewerPersonality, value: number) => {
    setPersonality(prev => ({ ...prev, [key]: value }))
  }

  const handleExtractValues = () => {
    if (linkedInText.trim().length < 30) return
    setIsExtracting(true)
    setTimeout(() => {
      const values = extractInterviewerValues(linkedInText)
      setExtractedValues(values)
      setIsExtracting(false)
    }, 600)
  }

  const handleComplete = () => {
    if (!interviewType) return
    onComplete({
      interviewType,
      difficultyLevel,
      personality,
      interviewMode,
      answerFormat,
      userEmphases: userEmphases.trim(),
      interviewerLinkedIn: linkedInText.trim(),
      extractedValues,
    })
  }

  return (
    <Card className={cn('max-w-3xl mx-auto overflow-hidden shadow-soft-lg', className)}>
      {/* Progress Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, idx) => {
            const StepIcon = s.icon
            const isCompleted = s.id < step
            const isCurrent = s.id === step
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                    }}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-rose text-white shadow-soft'
                          : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-4.5 h-4.5" />
                    )}
                  </motion.div>
                  <span className={cn(
                    'text-[10px] font-medium mt-1.5 text-center',
                    isCurrent ? 'text-rose-dark' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
                  )}>
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2 mt-[-16px] transition-colors',
                    s.id < step ? 'bg-emerald-400' : 'bg-gray-200'
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <CardContent className="px-6 pb-6 min-h-[380px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* =========================== Step 1: Basics =========================== */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">What kind of interview?</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the interview format and difficulty level.
                  </p>
                </div>

                {/* Interview Type Grid */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Interview Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INTERVIEW_TYPES.map(t => {
                      const Icon = TYPE_ICONS[t.icon] || Briefcase
                      return (
                        <button
                          key={t.value}
                          onClick={() => setInterviewType(t.value)}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all',
                            interviewType === t.value
                              ? 'border-rose bg-rose-light/30 shadow-soft'
                              : 'border-gray-200 hover:border-rose/50 hover:bg-gray-50'
                          )}
                        >
                          <Icon className={cn(
                            'w-4 h-4 mb-1.5',
                            interviewType === t.value ? 'text-rose-dark' : 'text-gray-400'
                          )} />
                          <p className="text-xs font-bold text-gray-800">{t.label}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Difficulty Level */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty Level</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DIFFICULTY_LEVELS.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setDifficultyLevel(d.value)}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all',
                          difficultyLevel === d.value
                            ? 'border-rose bg-rose-light/30 shadow-soft'
                            : 'border-gray-200 hover:border-rose/50 hover:bg-gray-50'
                        )}
                      >
                        <p className="text-xs font-bold text-gray-800">{d.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{d.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================== Step 2: Personality =========================== */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Set the interviewer personality</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Adjust these sliders to calibrate how the AI interviewer behaves.
                  </p>
                </div>

                <div className="space-y-4 bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                  {PERSONALITY_SLIDERS.map(slider => (
                    <PersonalitySlider
                      key={slider.key}
                      config={personality}
                      slider={slider}
                      onChange={handlePersonalityChange}
                    />
                  ))}
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Presets</Label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setPersonality({ warmth: 80, directness: 30, intensity: 25, technicalDepth: 40, paceSpeed: 35 })}
                      className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-rose/50 hover:bg-rose-light/20 transition-all"
                    >
                      Supportive Coach
                    </button>
                    <button
                      onClick={() => setPersonality({ warmth: 30, directness: 85, intensity: 80, technicalDepth: 60, paceSpeed: 70 })}
                      className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-rose/50 hover:bg-rose-light/20 transition-all"
                    >
                      Tough Skeptic
                    </button>
                    <button
                      onClick={() => setPersonality({ warmth: 50, directness: 60, intensity: 50, technicalDepth: 90, paceSpeed: 55 })}
                      className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-rose/50 hover:bg-rose-light/20 transition-all"
                    >
                      Deep Technologist
                    </button>
                    <button
                      onClick={() => setPersonality({ warmth: 65, directness: 70, intensity: 55, technicalDepth: 30, paceSpeed: 60 })}
                      className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-rose/50 hover:bg-rose-light/20 transition-all"
                    >
                      Strategic Exec
                    </button>
                    <button
                      onClick={() => setPersonality({ ...DEFAULT_PERSONALITY })}
                      className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-medium text-gray-400 hover:border-gray-300 transition-all"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================== Step 3: Mode =========================== */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">How do you want to practice?</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the interview simulation mode and answer format.
                  </p>
                </div>

                {/* Interview Mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Interview Mode</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setInterviewMode('conversational')}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all',
                        interviewMode === 'conversational'
                          ? 'border-rose bg-rose-light/30 shadow-soft'
                          : 'border-gray-200 hover:border-rose/50'
                      )}
                    >
                      <Video className={cn(
                        'w-5 h-5 mb-2',
                        interviewMode === 'conversational' ? 'text-rose-dark' : 'text-gray-400'
                      )} />
                      <p className="text-sm font-bold text-gray-800">Conversational</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                        Avatar + Voice simulation. Closest to a real interview experience.
                      </p>
                    </button>
                    <button
                      onClick={() => setInterviewMode('traditional')}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all',
                        interviewMode === 'traditional'
                          ? 'border-rose bg-rose-light/30 shadow-soft'
                          : 'border-gray-200 hover:border-rose/50'
                      )}
                    >
                      <FileText className={cn(
                        'w-5 h-5 mb-2',
                        interviewMode === 'traditional' ? 'text-rose-dark' : 'text-gray-400'
                      )} />
                      <p className="text-sm font-bold text-gray-800">Traditional</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                        Text or voice without avatar. Focus on content quality.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Answer Format (only shown in Traditional mode) */}
                {interviewMode === 'traditional' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Answer Format</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setAnswerFormat('text')}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all',
                          answerFormat === 'text'
                            ? 'border-indigo-400 bg-indigo-50 shadow-soft'
                            : 'border-gray-200 hover:border-indigo-200'
                        )}
                      >
                        <MessageSquare className={cn(
                          'w-4 h-4 mb-1',
                          answerFormat === 'text' ? 'text-indigo-600' : 'text-gray-400'
                        )} />
                        <p className="text-xs font-bold text-gray-800">Text Only</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Scored on content only</p>
                      </button>
                      <button
                        onClick={() => setAnswerFormat('voice')}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all',
                          answerFormat === 'voice'
                            ? 'border-indigo-400 bg-indigo-50 shadow-soft'
                            : 'border-gray-200 hover:border-indigo-200'
                        )}
                      >
                        <Mic className={cn(
                          'w-4 h-4 mb-1',
                          answerFormat === 'voice' ? 'text-indigo-600' : 'text-gray-400'
                        )} />
                        <p className="text-xs font-bold text-gray-800">Voice</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Content + delivery scoring</p>
                      </button>
                    </div>

                    {/* Scoring Split Explanation */}
                    <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                      <p className="text-[10px] text-indigo-600 font-medium">
                        {answerFormat === 'text'
                          ? 'Text answers are scored on content quality only: structure, relevance, and depth.'
                          : 'Voice answers are scored on content (70%) + delivery (30%): pace, clarity, filler words, confidence.'}
                      </p>
                    </div>
                  </div>
                )}

                {interviewMode === 'conversational' && (
                  <div className="bg-rose-light/30 rounded-lg p-3 border border-rose/30">
                    <p className="text-[10px] text-rose-dark font-medium">
                      Conversational mode uses both content and delivery scoring with avatar-based real-time feedback.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* =========================== Step 4: External Intelligence =========================== */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Your unfair advantage</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Help the AI interviewer focus on what matters most. Both fields are optional but powerful.
                  </p>
                </div>

                {/* User Emphases */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    What do you want to highlight?
                  </Label>
                  <Textarea
                    value={userEmphases}
                    onChange={e => setUserEmphases(e.target.value)}
                    rows={3}
                    placeholder="e.g., My cross-functional leadership experience, the $2M revenue project, my team-building during rapid scaling..."
                    className="text-xs"
                  />
                  <p className="text-[10px] text-gray-400">
                    These topics become priority question themes for the AI interviewer.
                  </p>
                </div>

                {/* LinkedIn Intelligence */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                    Interviewer LinkedIn / Bio
                  </Label>
                  <Textarea
                    value={linkedInText}
                    onChange={e => {
                      setLinkedInText(e.target.value)
                      setExtractedValues(null) // Reset on change
                    }}
                    rows={4}
                    placeholder="Paste the interviewer's LinkedIn summary, About section, or any public bio text..."
                    className="text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExtractValues}
                      disabled={linkedInText.trim().length < 30 || isExtracting}
                      className="text-xs"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 mr-1" />
                          Extract Values
                        </>
                      )}
                    </Button>
                    <span className="text-[10px] text-gray-400">
                      Min 30 characters to analyze
                    </span>
                  </div>
                </div>

                {/* Extracted Values Display */}
                {extractedValues && extractedValues.inferredPriorities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3"
                  >
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Values Extracted
                    </p>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 uppercase">Priorities</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extractedValues.inferredPriorities.map((p, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-medium text-emerald-700">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium text-gray-500 uppercase">Communication Style</p>
                        <p className="text-xs text-gray-700">{extractedValues.communicationStyle}</p>
                      </div>

                      {extractedValues.likelyQuestionThemes.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-gray-500 uppercase">Likely Question Themes</p>
                          <ul className="mt-1 space-y-0.5">
                            {extractedValues.likelyQuestionThemes.slice(0, 4).map((q, i) => (
                              <li key={i} className="text-[10px] text-gray-600 flex items-start gap-1">
                                <span className="text-emerald-500 mt-0.5">•</span>
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {extractedValues.culturalSignals.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-gray-500 uppercase">Cultural Signals</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {extractedValues.culturalSignals.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-blue-100 text-[10px] font-medium text-blue-700">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>

      {/* Navigation Footer */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-gray-500"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {step === 1 && onCancel ? 'Cancel' : 'Back'}
        </Button>

        {step < 4 ? (
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-rose text-white hover:bg-rose-dark disabled:opacity-50"
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleComplete}
            className="bg-gradient-to-r from-rose to-lavender text-white hover:from-rose-dark hover:to-lavender-dark"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Prepare Interview
          </Button>
        )}
      </div>
    </Card>
  )
}
