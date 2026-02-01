'use client'

/**
 * STAR Method Builder Component
 *
 * A step-by-step builder that guides users through crafting
 * structured interview answers using the STAR method, with
 * PM coaching context from Siggy's PM Intelligence module.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Target,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react'
import { PM_COACHING_CONTEXTS } from '@/lib/ai/siggy-pm-intelligence'
import { usePMAnalysis } from '@/hooks/usePMAnalysis'
import { cn } from '@/lib/utils'

type STARStep = 'situation' | 'task' | 'action' | 'result'

const STEP_CONFIG: Array<{
  key: STARStep
  label: string
  letter: string
  color: string
  bgColor: string
  borderColor: string
  ringColor: string
}> = [
  {
    key: 'situation',
    label: 'Situation',
    letter: 'S',
    color: 'text-blue-700',
    bgColor: 'bg-blue-600',
    borderColor: 'border-blue-300',
    ringColor: 'ring-blue-200',
  },
  {
    key: 'task',
    label: 'Task',
    letter: 'T',
    color: 'text-amber-700',
    bgColor: 'bg-amber-600',
    borderColor: 'border-amber-300',
    ringColor: 'ring-amber-200',
  },
  {
    key: 'action',
    label: 'Action',
    letter: 'A',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-600',
    borderColor: 'border-emerald-300',
    ringColor: 'ring-emerald-200',
  },
  {
    key: 'result',
    label: 'Result',
    letter: 'R',
    color: 'text-purple-700',
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-300',
    ringColor: 'ring-purple-200',
  },
]

export function STARBuilder() {
  const [story, setStory] = useState({
    situation: '',
    task: '',
    action: '',
    result: '',
  })
  const [currentStep, setCurrentStep] = useState<STARStep>('situation')
  const [copied, setCopied] = useState(false)

  const starTemplate = PM_COACHING_CONTEXTS.interviewCoach.starTemplate

  // Analyze the combined STAR answer for PM score
  const fullAnswer = Object.values(story).filter(Boolean).join(' ')
  const { analysis: pmAnalysis } = usePMAnalysis(fullAnswer)

  const completedSteps = STEP_CONFIG.filter((s) => story[s.key].trim().length > 0).length
  const isComplete = completedSteps === 4

  const handleReset = () => {
    setStory({ situation: '', task: '', action: '', result: '' })
    setCurrentStep('situation')
    setCopied(false)
  }

  const handleCopy = () => {
    const text = STEP_CONFIG.map(
      (s) => `**${s.label}:** ${story[s.key]}`
    ).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">STAR Story Builder</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {completedSteps}/4 steps
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pmAnalysis && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                pmAnalysis.score >= 80
                  ? 'bg-green-100 text-green-800'
                  : pmAnalysis.score >= 60
                    ? 'bg-yellow-100 text-yellow-800'
                    : pmAnalysis.score >= 40
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
              }`}
            >
              <Brain className="w-3 h-3" />
              PM: {pmAnalysis.score}/100
            </div>
          )}
          {isComplete && (
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {STEP_CONFIG.map((step) => (
          <div
            key={step.key}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              story[step.key].trim() ? step.bgColor : 'bg-gray-200'
            )}
          />
        ))}
      </div>

      {/* STAR Steps */}
      <div className="space-y-3">
        {STEP_CONFIG.map((step, idx) => {
          const isActive = currentStep === step.key
          const hasContent = story[step.key].trim().length > 0

          return (
            <div
              key={step.key}
              className={cn(
                'rounded-xl border-2 transition-all duration-200',
                isActive
                  ? `${step.borderColor} ring-2 ${step.ringColor} shadow-sm`
                  : hasContent
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Step header */}
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setCurrentStep(step.key)}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0',
                    hasContent ? 'bg-green-600' : isActive ? step.bgColor : 'bg-gray-300'
                  )}
                >
                  {hasContent ? <CheckCircle className="w-4 h-4" /> : step.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-semibold text-sm', isActive ? step.color : 'text-gray-700')}>
                    {step.label}
                  </p>
                  {!isActive && hasContent && (
                    <p className="text-xs text-gray-500 truncate">{story[step.key]}</p>
                  )}
                </div>
                {isActive ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Step content (expanded) */}
              {isActive && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-xs text-gray-500 pl-11">
                    {starTemplate[step.key]}
                  </p>
                  <textarea
                    value={story[step.key]}
                    onChange={(e) => {
                      setStory((prev) => ({ ...prev, [step.key]: e.target.value }))
                    }}
                    placeholder={`Describe the ${step.label.toLowerCase()}...`}
                    className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 min-h-[80px]"
                    rows={3}
                    autoFocus
                  />
                  {/* Next step button */}
                  {story[step.key].trim() && idx < 3 && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(STEP_CONFIG[idx + 1].key)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        Next: {STEP_CONFIG[idx + 1].label}
                        <ChevronDown className="w-3.5 h-3.5 ml-1 rotate-[-90deg]" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* PM Coaching Tips */}
      <Card className="bg-purple-50/50 border-purple-100">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-purple-900">
                PM Interview Tips:
              </p>
              <ul className="text-xs text-purple-700 space-y-1">
                <li className="flex items-start gap-1.5">
                  <Target className="w-3 h-3 mt-0.5 shrink-0" />
                  Specific metrics and outcomes (%, $, users)
                </li>
                <li className="flex items-start gap-1.5">
                  <Target className="w-3 h-3 mt-0.5 shrink-0" />
                  User impact and business value
                </li>
                <li className="flex items-start gap-1.5">
                  <Target className="w-3 h-3 mt-0.5 shrink-0" />
                  Data-driven decision making
                </li>
                <li className="flex items-start gap-1.5">
                  <Target className="w-3 h-3 mt-0.5 shrink-0" />
                  Cross-functional collaboration
                </li>
              </ul>

              {/* PM Score feedback when answer is being written */}
              {pmAnalysis && pmAnalysis.feedback.suggestions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-purple-200 space-y-1">
                  <p className="text-xs font-medium text-purple-900">
                    Strengthen your answer:
                  </p>
                  {pmAnalysis.feedback.suggestions.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-purple-700">
                      &rarr; {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
