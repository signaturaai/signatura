'use client'

/**
 * Gap-Filling Interview Page
 *
 * The final stage of the tailoring flow, positioned between CV Analysis
 * and Final Generation. Extracts missing critical information from the
 * user to close competency gaps identified by the ScoreArbiter.
 *
 * Flow: Input → Gap Analysis → Guided Questions → Summary → Generation
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
  Label,
  Input,
} from '@/components/ui'
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Brain,
  Target,
  TrendingUp,
  CheckCircle,
  RotateCcw,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  identifyGaps,
  analyzeCVContent,
  type GapQuestion,
  type GapAnalysisResult,
} from '@/lib/ai/siggy-integration-guide'
import {
  GapFillingWizard,
  type GapResponse,
} from '@/components/cv/GapFillingWizard'
import { useAutoSave } from '@/hooks/useAutoSave'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageMode = 'input' | 'analyzing' | 'interview' | 'summary' | 'generating'

interface GapFillingState {
  bullets: string
  jobTitle: string
  jobDescription: string
  responses: Record<string, GapResponse>
}

// ---------------------------------------------------------------------------
// Sample data for quick-start
// ---------------------------------------------------------------------------

const SAMPLE_BULLETS = `Managed the product roadmap for an analytics platform
Worked with engineering and design teams on feature delivery
Launched a dashboard feature for internal stakeholders
Attended weekly meetings and provided project updates
Built features based on customer feedback`

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function GapFillingPage() {
  const [mode, setMode] = useState<PageMode>('input')
  const [bullets, setBullets] = useState(SAMPLE_BULLETS)
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [gapResult, setGapResult] = useState<GapAnalysisResult | null>(null)
  const [responses, setResponses] = useState<Record<string, GapResponse>>({})
  const [error, setError] = useState<string | null>(null)

  // Autosave responses
  const { saveStatus, loadSaved, clearSaved } = useAutoSave<GapFillingState>(
    { bullets, jobTitle, jobDescription, responses },
    { key: 'signatura-gap-filling', debounceMs: 1500 }
  )

  // Restore saved session on mount
  const handleRestoreSaved = useCallback(() => {
    const saved = loadSaved()
    if (saved) {
      setBullets(saved.bullets || SAMPLE_BULLETS)
      setJobTitle(saved.jobTitle || '')
      setJobDescription(saved.jobDescription || '')
      if (saved.responses && Object.keys(saved.responses).length > 0) {
        setResponses(saved.responses)
      }
    }
  }, [loadSaved])

  // Run gap analysis
  const handleAnalyze = useCallback(() => {
    const bulletArray = bullets
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0)

    if (bulletArray.length === 0) {
      setError('Please enter at least one CV bullet point.')
      return
    }

    setError(null)
    setMode('analyzing')

    // Simulate brief analysis delay for premium feel
    setTimeout(() => {
      try {
        const result = identifyGaps(
          bulletArray,
          jobTitle || undefined,
          jobDescription || undefined,
          5
        )

        if (result.gaps.length === 0) {
          setError(
            'Your CV looks strong — no significant gaps identified. Try the CV Analysis Dashboard for detailed scoring.'
          )
          setMode('input')
          return
        }

        setGapResult(result)

        // Initialize responses for each gap (preserve any saved responses)
        const init: Record<string, GapResponse> = {}
        result.gaps.forEach((g) => {
          init[g.id] = responses[g.id] || {
            gapId: g.id,
            answer: '',
            skipped: false,
            aiDrafted: false,
          }
        })
        setResponses(init)
        setMode('interview')
      } catch (err) {
        setError('Analysis failed. Please check your input and try again.')
        setMode('input')
      }
    }, 800)
  }, [bullets, jobTitle, jobDescription, responses])

  // Handle individual response changes (from wizard)
  const handleResponseChange = useCallback(
    (gapId: string, response: GapResponse) => {
      setResponses((prev) => ({ ...prev, [gapId]: response }))
    },
    []
  )

  // Handle wizard completion
  const handleComplete = useCallback(
    (finalResponses: Record<string, GapResponse>) => {
      setResponses(finalResponses)
      setMode('summary')
    },
    []
  )

  // Trigger final generation
  const handleGenerate = useCallback(() => {
    setMode('generating')
    // In a real app, this would POST to an API endpoint
    // For now, simulate the transition
    setTimeout(() => {
      // Would redirect to /cv/tailor with enhanced data
    }, 3000)
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    setMode('input')
    setGapResult(null)
    setResponses({})
    setError(null)
    clearSaved()
  }, [clearSaved])

  // Compute summary stats
  const summaryStats = useMemo(() => {
    const answered = Object.values(responses).filter(
      (r) => !r.skipped && r.answer.trim().length > 0
    )
    const skipped = Object.values(responses).filter((r) => r.skipped)
    return {
      answeredCount: answered.length,
      skippedCount: skipped.length,
      totalCount: Object.keys(responses).length,
      aiDraftedCount: answered.filter((r) => r.aiDrafted).length,
    }
  }, [responses])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Gap-Filling Interview
        </h1>
        <p className="text-sm text-gray-500 max-w-lg mx-auto">
          {mode === 'input' &&
            "Let's identify what's missing from your CV and fill the gaps together. Think of this as a quick chat with a senior mentor."}
          {mode === 'analyzing' && 'Analyzing your CV for competency gaps...'}
          {mode === 'interview' &&
            "Answer a few quick questions to strengthen your CV. Skip any that don't apply."}
          {mode === 'summary' && "Here's what you shared. Ready to generate your enhanced CV?"}
          {mode === 'generating' &&
            'Generating your enhanced CV with gap-filled content...'}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ============================================================= */}
      {/* MODE: Input */}
      {/* ============================================================= */}
      {mode === 'input' && (
        <div className="space-y-6">
          {/* Restore saved session */}
          {loadSaved() && (
            <button
              onClick={handleRestoreSaved}
              className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restore previous session
            </button>
          )}

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Your CV Bullets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  Paste your current CV bullet points (one per line)
                </Label>
                <Textarea
                  value={bullets}
                  onChange={(e) => setBullets(e.target.value)}
                  placeholder="Managed the product roadmap..."
                  className="min-h-[160px] text-sm leading-relaxed"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Job Title (optional)
                  </Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Product Manager"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Target Job Description (optional)
                  </Label>
                  <div className="relative">
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description..."
                      className="min-h-[38px] max-h-[120px] text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleAnalyze}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg h-12 text-sm font-medium"
          >
            <Target className="w-4 h-4 mr-2" />
            Identify Gaps
          </Button>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODE: Analyzing */}
      {/* ============================================================= */}
      {mode === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-xl">
              <Brain className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-indigo-200 animate-ping opacity-20" />
          </div>
          <p className="text-gray-600 font-medium">
            Running 4-stage analysis...
          </p>
          <p className="text-xs text-gray-400">
            Indicators, ATS, Recruiter UX, PM Intelligence
          </p>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODE: Interview (Wizard) */}
      {/* ============================================================= */}
      {mode === 'interview' && gapResult && (
        <div className="space-y-6">
          {/* Score context bar */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {gapResult.currentScore}
                </p>
                <p className="text-xs text-gray-500">Current</p>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400" />
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {gapResult.projectedScore}
                </p>
                <p className="text-xs text-gray-500">Projected</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-indigo-100">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">
                +{gapResult.projectedScore - gapResult.currentScore}%
              </span>
            </div>
          </div>

          {/* Wizard */}
          <GapFillingWizard
            gaps={gapResult.gaps}
            existingBullets={bullets.split('\n').filter((b) => b.trim())}
            jobTitle={jobTitle || undefined}
            jobDescription={jobDescription || undefined}
            initialResponses={responses}
            saveStatus={saveStatus}
            onResponseChange={handleResponseChange}
            onComplete={handleComplete}
          />
        </div>
      )}

      {/* ============================================================= */}
      {/* MODE: Summary */}
      {/* ============================================================= */}
      {mode === 'summary' && gapResult && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-emerald-50 border-emerald-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryStats.answeredCount}
                </p>
                <p className="text-xs text-emerald-600 mt-1">Answered</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-gray-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-500">
                  {summaryStats.skippedCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">Skipped</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">
                  {gapResult.projectedScore}
                </p>
                <p className="text-xs text-indigo-600 mt-1">Projected Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Responses review */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Your Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gapResult.gaps.map((gap) => {
                const response = responses[gap.id]
                const isSkipped = response?.skipped
                const hasAnswer =
                  !isSkipped && response?.answer?.trim().length > 0

                return (
                  <div
                    key={gap.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      hasAnswer
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {hasAnswer ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">
                          {gap.principleName}
                        </p>
                        {hasAnswer ? (
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {response.answer}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1 italic">
                            Skipped
                          </p>
                        )}
                        {response?.aiDrafted && hasAnswer && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-1">
                            <Sparkles className="w-3 h-3" />
                            AI-assisted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setMode('interview')}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Edit Answers
            </Button>
            <Button
              onClick={handleGenerate}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Enhanced CV
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="w-full text-gray-400 hover:text-gray-600"
          >
            Start Over
          </Button>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODE: Generating */}
      {/* ============================================================= */}
      {mode === 'generating' && (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute -inset-3 rounded-full border-2 border-emerald-200 animate-ping opacity-20" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-gray-900">
              Generating Your Enhanced CV
            </p>
            <p className="text-sm text-gray-500 max-w-sm">
              Weaving your gap-filled answers into optimised bullet points.
              This combines your authentic experience with professional
              framing.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Applying 4-stage scoring pipeline...
          </div>
        </div>
      )}
    </div>
  )
}
