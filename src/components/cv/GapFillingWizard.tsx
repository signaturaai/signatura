'use client'

/**
 * Gap-Filling Interview Wizard
 *
 * Single-question-at-a-time stepper that guides users through
 * competency gap questions identified by the ScoreArbiter.
 * Feels like a conversation with a high-level mentor, not a form.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Card,
  CardContent,
  Textarea,
  Label,
} from '@/components/ui'
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Sparkles,
  Loader2,
  HelpCircle,
  CheckCircle,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GapQuestion } from '@/lib/ai/siggy-integration-guide'
import { draftGapAnswer } from '@/lib/ai/siggy-integration-guide'
import type { SaveStatus } from '@/hooks/useAutoSave'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GapResponse {
  gapId: string
  answer: string
  skipped: boolean
  aiDrafted: boolean
}

interface GapFillingWizardProps {
  gaps: GapQuestion[]
  existingBullets: string[]
  jobTitle?: string
  jobDescription?: string
  initialResponses?: Record<string, GapResponse>
  saveStatus?: SaveStatus
  onResponseChange: (gapId: string, response: GapResponse) => void
  onComplete: (responses: Record<string, GapResponse>) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({
  current,
  total,
  responses,
}: {
  current: number
  total: number
  responses: Record<string, GapResponse>
}) {
  const answeredCount = Object.values(responses).filter(
    (r) => !r.skipped && r.answer.trim().length > 0
  ).length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 font-medium">
          Question {current + 1} of {total}
        </span>
        <span className="text-indigo-600 font-medium">
          {answeredCount} answered
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
      {/* Step indicators */}
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const gap = responses[Object.keys(responses)[i]]
          const isAnswered = gap && !gap.skipped && gap.answer.trim().length > 0
          const isSkipped = gap?.skipped
          const isCurrent = i === current

          return (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                isCurrent
                  ? 'bg-indigo-500'
                  : isAnswered
                    ? 'bg-emerald-400'
                    : isSkipped
                      ? 'bg-gray-300'
                      : 'bg-gray-200'
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium transition-opacity duration-300',
        status === 'saving' && 'text-gray-400',
        status === 'saved' && 'text-emerald-500',
        status === 'error' && 'text-red-500'
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </>
      )}
      {status === 'saved' && (
        <>
          <Save className="w-3 h-3" />
          Saved
        </>
      )}
      {status === 'error' && (
        <>
          <HelpCircle className="w-3 h-3" />
          Save failed
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Wizard Component
// ---------------------------------------------------------------------------

export function GapFillingWizard({
  gaps,
  existingBullets,
  jobTitle,
  jobDescription,
  initialResponses,
  saveStatus = 'idle',
  onResponseChange,
  onComplete,
  className = '',
}: GapFillingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Record<string, GapResponse>>(() => {
    if (initialResponses && Object.keys(initialResponses).length > 0) {
      return initialResponses
    }
    const init: Record<string, GapResponse> = {}
    gaps.forEach((g) => {
      init[g.id] = { gapId: g.id, answer: '', skipped: false, aiDrafted: false }
    })
    return init
  })
  const [isDrafting, setIsDrafting] = useState(false)
  const [showWhyWeAsk, setShowWhyWeAsk] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const currentGap = gaps[currentStep]
  const currentResponse = responses[currentGap?.id]
  const isLastStep = currentStep === gaps.length - 1

  // Smooth transition between steps
  const transitionTo = useCallback(
    (nextStep: number) => {
      setIsTransitioning(true)
      setShowWhyWeAsk(false)
      setTimeout(() => {
        setCurrentStep(nextStep)
        setIsTransitioning(false)
      }, 250)
    },
    []
  )

  // Update a response and notify parent
  const updateResponse = useCallback(
    (gapId: string, patch: Partial<GapResponse>) => {
      setResponses((prev) => {
        const updated = { ...prev[gapId], ...patch } as GapResponse
        const next = { ...prev, [gapId]: updated }
        onResponseChange(gapId, updated)
        return next
      })
    },
    [onResponseChange]
  )

  // Handle textarea input
  const handleTextChange = (text: string) => {
    if (!currentGap) return
    updateResponse(currentGap.id, { answer: text, skipped: false })
  }

  // AI Draft suggestion
  const handleDraftWithAI = () => {
    if (!currentGap) return
    setIsDrafting(true)
    // Simulate slight delay for "thinking" feel
    setTimeout(() => {
      const draft = draftGapAnswer(
        currentGap,
        existingBullets,
        jobTitle,
        jobDescription
      )
      updateResponse(currentGap.id, {
        answer: draft,
        aiDrafted: true,
        skipped: false,
      })
      setIsDrafting(false)
    }, 600)
  }

  // Navigation
  const handleNext = () => {
    if (isLastStep) {
      onComplete(responses)
    } else {
      transitionTo(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      transitionTo(currentStep - 1)
    }
  }

  const handleSkip = () => {
    if (!currentGap) return
    updateResponse(currentGap.id, { skipped: true, answer: '' })
    if (isLastStep) {
      onComplete(responses)
    } else {
      transitionTo(currentStep + 1)
    }
  }

  if (!currentGap) return null

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress */}
      <ProgressBar
        current={currentStep}
        total={gaps.length}
        responses={responses}
      />

      {/* Question Card */}
      <div
        className={cn(
          'transition-all duration-250 ease-out',
          isTransitioning
            ? 'opacity-0 translate-y-2'
            : 'opacity-100 translate-y-0'
        )}
      >
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {/* Siggy's question */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-indigo-600 mb-1">
                    {currentGap.principleName}
                  </p>
                  <p className="text-lg text-gray-900 font-medium leading-relaxed">
                    {currentGap.question}
                  </p>
                </div>
              </div>

              {/* "Why we ask this" toggle */}
              <button
                onClick={() => setShowWhyWeAsk(!showWhyWeAsk)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 transition-colors ml-11"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Why we ask this
              </button>

              {showWhyWeAsk && (
                <div className="ml-11 p-3 bg-indigo-50/80 rounded-lg border border-indigo-100 text-sm text-indigo-700 animate-in fade-in slide-in-from-top-1 duration-200">
                  {currentGap.whyWeAsk}
                  {currentGap.potentialBoost > 0 && (
                    <span className="block mt-1 font-medium text-indigo-600">
                      Potential score boost: +{currentGap.potentialBoost}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Answer textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-600">Your answer</Label>
                <SaveIndicator status={saveStatus} />
              </div>
              <Textarea
                value={currentResponse?.answer ?? ''}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Share your experience in your own words... be as specific as you can."
                className="min-h-[140px] resize-y text-sm leading-relaxed border-gray-200 focus:border-indigo-300 focus:ring-indigo-200/50 transition-colors"
              />
              {currentResponse?.aiDrafted && currentResponse.answer.length > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-drafted — edit this to make it authentically yours
                </p>
              )}
            </div>

            {/* AI Draft button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDraftWithAI}
              disabled={isDrafting}
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
            >
              {isDrafting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Drafting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Draft with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="text-gray-500"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600"
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            className={cn(
              'transition-all duration-200',
              isLastStep
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white'
            )}
          >
            {isLastStep ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Finish
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
