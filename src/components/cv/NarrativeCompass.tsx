'use client'

/**
 * Narrative Compass — 5-Question Strategic Onboarding Stepper
 *
 * Collects the user's "Desired Brand" via a guided, mentoring-style
 * multi-step form. Each question builds on the previous to paint a
 * complete picture of how the user wants to be perceived.
 *
 * Stores answers in a NarrativeProfile object.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  Textarea,
  Input,
  Button,
} from '@/components/ui'
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Target,
  TrendingUp,
  Shield,
  Lightbulb,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NarrativeProfile, SeniorityLevel, CoreStrength } from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Step configuration
// ---------------------------------------------------------------------------

interface StepConfig {
  id: number
  title: string
  subtitle: string
  icon: typeof Compass
  iconColor: string
}

const STEPS: StepConfig[] = [
  { id: 1, title: 'Career Target', subtitle: 'What is your next career target?', icon: Target, iconColor: 'text-indigo-500' },
  { id: 2, title: 'Seniority Level', subtitle: 'Where are you in your career journey?', icon: TrendingUp, iconColor: 'text-violet-500' },
  { id: 3, title: 'Your Superpower', subtitle: 'Select your professional superpower.', icon: Shield, iconColor: 'text-emerald-500' },
  { id: 4, title: 'Career Hurdle', subtitle: 'What\'s your biggest career challenge?', icon: Lightbulb, iconColor: 'text-amber-500' },
  { id: 5, title: 'Desired Brand', subtitle: 'How do you want recruiters to see you?', icon: User, iconColor: 'text-rose-500' },
]

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string; description: string }[] = [
  { value: 'junior', label: 'Junior', description: '0-2 years — building foundations' },
  { value: 'mid', label: 'Mid-Level', description: '3-5 years — delivering independently' },
  { value: 'senior', label: 'Senior', description: '6-10 years — leading and mentoring' },
  { value: 'executive', label: 'Executive', description: '10+ years — setting direction' },
]

const STRENGTH_OPTIONS: { value: CoreStrength; label: string; description: string; icon: string }[] = [
  { value: 'strategic-leadership', label: 'Strategic Leadership', description: 'Setting vision and aligning teams', icon: '🎯' },
  { value: 'technical-mastery', label: 'Technical Mastery', description: 'Deep systems and engineering expertise', icon: '🔧' },
  { value: 'operational-excellence', label: 'Operational Excellence', description: 'Shipping fast and running smooth', icon: '⚡' },
  { value: 'business-innovation', label: 'Business Innovation', description: 'Driving growth and market impact', icon: '📈' },
]

const PAIN_POINT_SUGGESTIONS = [
  'Not getting noticed for leadership roles',
  'CV doesn\'t reflect my actual impact',
  'Struggling to transition to product management',
  'Recruiters see me as too technical / not strategic enough',
  'Career gap making it hard to compete',
]

// ---------------------------------------------------------------------------
// Slide animation variants
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
  }),
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = (current / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Step {current} of {total}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className="flex gap-1">
        {STEPS.map(step => (
          <div
            key={step.id}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              step.id <= current ? 'bg-indigo-400' : 'bg-gray-200'
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface NarrativeCompassProps {
  onComplete: (profile: NarrativeProfile) => void
  initialProfile?: Partial<NarrativeProfile>
}

export function NarrativeCompass({ onComplete, initialProfile }: NarrativeCompassProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(1)

  // Form state
  const [targetRole, setTargetRole] = useState(initialProfile?.targetRole || '')
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel | null>(initialProfile?.seniorityLevel || null)
  const [coreStrength, setCoreStrength] = useState<CoreStrength | null>(initialProfile?.coreStrength || null)
  const [painPoint, setPainPoint] = useState(initialProfile?.painPoint || '')
  const [desiredBrand, setDesiredBrand] = useState(initialProfile?.desiredBrand || '')

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1: return targetRole.trim().length >= 3
      case 2: return seniorityLevel !== null
      case 3: return coreStrength !== null
      case 4: return painPoint.trim().length >= 5
      case 5: return desiredBrand.trim().length >= 10
      default: return false
    }
  }, [currentStep, targetRole, seniorityLevel, coreStrength, painPoint, desiredBrand])

  const handleNext = useCallback(() => {
    if (!canProceed()) return
    if (currentStep === 5) {
      // Complete
      onComplete({
        targetRole: targetRole.trim(),
        seniorityLevel: seniorityLevel!,
        coreStrength: coreStrength!,
        painPoint: painPoint.trim(),
        desiredBrand: desiredBrand.trim(),
      })
      return
    }
    setDirection(1)
    setCurrentStep(prev => prev + 1)
  }, [currentStep, canProceed, onComplete, targetRole, seniorityLevel, coreStrength, painPoint, desiredBrand])

  const handleBack = useCallback(() => {
    if (currentStep <= 1) return
    setDirection(-1)
    setCurrentStep(prev => prev - 1)
  }, [currentStep])

  const stepConfig = STEPS[currentStep - 1]
  const StepIcon = stepConfig.icon

  return (
    <Card className="relative overflow-hidden border border-indigo-200/60 bg-white/90 backdrop-blur-sm shadow-lg">
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">The Compass</h2>
            <p className="text-sm text-gray-500">Define your strategic career narrative</p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar current={currentStep} total={5} />

        {/* Step content */}
        <div className="min-h-[280px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Step header */}
              <div className="flex items-center gap-2 mb-4">
                <StepIcon className={cn('h-5 w-5', stepConfig.iconColor)} />
                <h3 className="text-lg font-semibold text-gray-900">{stepConfig.title}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-5">{stepConfig.subtitle}</p>

              {/* Step 1: Target Role */}
              {currentStep === 1 && (
                <div className="space-y-3">
                  <Input
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    placeholder="e.g., Senior Product Manager, Engineering Lead, VP of Growth"
                    className="text-base"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400">Be specific — this shapes how we position you.</p>
                </div>
              )}

              {/* Step 2: Seniority Level */}
              {currentStep === 2 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {SENIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSeniorityLevel(opt.value)}
                      className={cn(
                        'flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all',
                        seniorityLevel === opt.value
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20'
                      )}
                    >
                      <span className="font-semibold text-gray-900">{opt.label}</span>
                      <span className="text-xs text-gray-500 mt-0.5">{opt.description}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Core Strength */}
              {currentStep === 3 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {STRENGTH_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCoreStrength(opt.value)}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
                        coreStrength === opt.value
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/20'
                      )}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <span className="font-semibold text-gray-900">{opt.label}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 4: Pain Point */}
              {currentStep === 4 && (
                <div className="space-y-3">
                  <Textarea
                    value={painPoint}
                    onChange={e => setPainPoint(e.target.value)}
                    placeholder="Describe your biggest career challenge..."
                    rows={3}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {PAIN_POINT_SUGGESTIONS.map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setPainPoint(suggestion)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition-colors',
                          painPoint === suggestion
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-gray-200 text-gray-500 hover:border-amber-200 hover:text-amber-600'
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Desired Brand */}
              {currentStep === 5 && (
                <div className="space-y-3">
                  <Textarea
                    value={desiredBrand}
                    onChange={e => setDesiredBrand(e.target.value)}
                    placeholder="e.g., 'A strategic product leader who bridges technical innovation with business growth.'"
                    rows={3}
                    className="text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400">
                    Write one sentence about how you want a recruiter to perceive you after reading your CV.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep <= 1}
            className="text-gray-500"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              'transition-all',
              currentStep === 5
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600'
                : ''
            )}
          >
            {currentStep === 5 ? (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Analyze My Narrative
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
