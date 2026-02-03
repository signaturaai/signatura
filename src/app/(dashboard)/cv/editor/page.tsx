'use client'

/**
 * Interactive Tailoring Editor
 *
 * Side-by-side comparison of original vs AI-suggested CV bullets.
 * Users can accept, reject, and edit individual suggestions.
 * Score updates in real-time with pulse animation on changes.
 *
 * Positioned as the core editing experience in the tailoring flow.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
  Label,
  Input,
  Button,
} from '@/components/ui'
import {
  Sparkles,
  CheckCircle,
  Copy,
  ArrowRight,
  Target,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TailoringCard } from '@/components/cv/TailoringCard'
import {
  scoreArbiter,
  extractJobKeywords,
  analyzeTailoringPair,
  analyzeCVContent,
  type TailoringAnalysis,
} from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BulletState {
  original: string
  suggested: string
  isAccepted: boolean
  analysis: TailoringAnalysis
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_ORIGINAL = [
  'Managed the product roadmap',
  'Worked with engineering and design teams',
  'Built features for users',
  'Attended meetings and provided updates',
  'Responsible for project timelines',
]

const SAMPLE_SUGGESTED = [
  'Led product roadmap strategy using RICE framework, shipping 15 high-impact features over 6 months resulting in 25% revenue growth',
  'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly syncs and stakeholder alignment',
  'Launched user-facing analytics platform for 50K customers, increasing engagement by 40% and reducing churn by 15%',
  'Drove executive stakeholder alignment through weekly product reviews, resulting in $2M budget approval and accelerated roadmap execution',
  'Established agile sprint cadence with data-driven prioritization, reducing time-to-market by 35% while improving team velocity by 20%',
]

const SAMPLE_JOB_DESCRIPTION = `We are looking for a Senior Product Manager with experience in:
- Strategic roadmap planning and RICE prioritization
- Cross-functional leadership with engineering and design teams
- Data-driven decision making with KPI tracking
- Stakeholder management and executive communication
- Agile methodology and sprint planning
- Revenue growth and user engagement metrics`

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TailoringEditorPage() {
  const [originalBullets, setOriginalBullets] = useState('')
  const [suggestedBullets, setSuggestedBullets] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('Senior Product Manager')
  const [bulletStates, setBulletStates] = useState<BulletState[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scorePulse, setScorePulse] = useState(false)
  const [resyncingIndex, setResyncingIndex] = useState<number | null>(null)
  const [showInput, setShowInput] = useState(true)
  const [copied, setCopied] = useState(false)

  const hasResults = bulletStates.length > 0

  // Extract job keywords once
  const jobKeywords = useMemo(
    () => extractJobKeywords(jobDescription),
    [jobDescription]
  )

  // Load sample data
  const handleLoadSample = useCallback(() => {
    setOriginalBullets(SAMPLE_ORIGINAL.join('\n'))
    setSuggestedBullets(SAMPLE_SUGGESTED.join('\n'))
    setJobDescription(SAMPLE_JOB_DESCRIPTION)
  }, [])

  // Run analysis
  const handleAnalyze = useCallback(() => {
    const origArr = originalBullets.split('\n').map(b => b.trim()).filter(b => b.length > 0)
    const sugArr = suggestedBullets.split('\n').map(b => b.trim()).filter(b => b.length > 0)

    if (origArr.length === 0 || sugArr.length === 0) return

    setIsAnalyzing(true)

    // Brief delay for premium feel
    setTimeout(() => {
      const maxLen = Math.max(origArr.length, sugArr.length)
      const states: BulletState[] = []

      for (let i = 0; i < maxLen; i++) {
        const original = origArr[i] || ''
        const suggested = sugArr[i] || original

        const analysis = analyzeTailoringPair(
          original,
          suggested,
          jobKeywords,
          jobTitle || undefined
        )

        states.push({
          original,
          suggested,
          isAccepted: analysis.scoreDelta > 0, // auto-accept improvements
          analysis,
        })
      }

      setBulletStates(states)
      setIsAnalyzing(false)
      setShowInput(false)
    }, 500)
  }, [originalBullets, suggestedBullets, jobKeywords, jobTitle])

  // Toggle accept
  const handleToggleAccept = useCallback((index: number) => {
    setBulletStates(prev => {
      const next = [...prev]
      next[index] = { ...next[index], isAccepted: !next[index].isAccepted }
      return next
    })
    // Trigger score pulse
    setScorePulse(true)
    setTimeout(() => setScorePulse(false), 600)
  }, [])

  // Edit suggestion
  const handleEditSuggestion = useCallback((index: number, newText: string) => {
    setBulletStates(prev => {
      const next = [...prev]
      next[index] = { ...next[index], suggested: newText }
      return next
    })
  }, [])

  // Re-sync score after edit
  const handleResync = useCallback((index: number) => {
    setResyncingIndex(index)
    setTimeout(() => {
      setBulletStates(prev => {
        const next = [...prev]
        const state = next[index]
        const analysis = analyzeTailoringPair(
          state.original,
          state.suggested,
          jobKeywords,
          jobTitle || undefined
        )
        next[index] = { ...state, analysis }
        return next
      })
      setResyncingIndex(null)
      setScorePulse(true)
      setTimeout(() => setScorePulse(false), 600)
    }, 400)
  }, [jobKeywords, jobTitle])

  // Copy final bullets
  const handleCopyFinal = useCallback(() => {
    const finalBullets = bulletStates.map(s =>
      s.isAccepted ? s.suggested : s.original
    )
    navigator.clipboard.writeText(finalBullets.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [bulletStates])

  // Reset
  const handleReset = useCallback(() => {
    setBulletStates([])
    setShowInput(true)
  }, [])

  // Computed stats
  const stats = useMemo(() => {
    if (bulletStates.length === 0) return null

    const accepted = bulletStates.filter(s => s.isAccepted)
    const totalOriginal = bulletStates.reduce((sum, s) => sum + s.analysis.originalScore, 0)
    const totalCurrent = bulletStates.reduce((sum, s) =>
      sum + (s.isAccepted ? s.analysis.suggestedScore : s.analysis.originalScore), 0
    )
    const avgOriginal = Math.round(totalOriginal / bulletStates.length)
    const avgCurrent = Math.round(totalCurrent / bulletStates.length)
    const totalKeywords = bulletStates.reduce(
      (sum, s) => sum + (s.isAccepted ? s.analysis.matchedKeywords.length : 0), 0
    )
    const totalGaps = new Set(
      bulletStates.flatMap(s => s.isAccepted ? s.analysis.gapsClosing.map(g => g.principleId) : [])
    ).size

    return {
      acceptedCount: accepted.length,
      totalCount: bulletStates.length,
      avgOriginal,
      avgCurrent,
      improvement: avgCurrent - avgOriginal,
      totalKeywords,
      totalGaps,
    }
  }, [bulletStates])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tailoring Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review, edit, and accept AI-suggested improvements for each bullet point.
          </p>
        </div>
        {hasResults && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInput(!showInput)}>
              {showInput ? 'Hide Input' : 'Edit Input'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* Input Section */}
      {/* ============================================================= */}
      {showInput && (
        <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Bullets (one per line)
                </Label>
                <Textarea
                  value={originalBullets}
                  onChange={(e) => setOriginalBullets(e.target.value)}
                  rows={5}
                  placeholder="Managed the product roadmap..."
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI-Suggested Bullets (one per line)
                </Label>
                <Textarea
                  value={suggestedBullets}
                  onChange={(e) => setSuggestedBullets(e.target.value)}
                  rows={5}
                  placeholder="Led product roadmap strategy..."
                  className="text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Product Manager"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Description (for keyword matching)
                </Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={2}
                  placeholder="Paste the job description..."
                  className="text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Analyze & Compare
                  </>
                )}
              </Button>
              {!hasResults && (
                <Button variant="outline" onClick={handleLoadSample}>
                  Load Sample Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================= */}
      {/* Score Header with Pulse Animation */}
      {/* ============================================================= */}
      {stats && (
        <motion.div
          animate={scorePulse ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/30 border-indigo-100/50 shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Score display */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 font-medium uppercase">Original</p>
                    <p className="text-3xl font-bold text-gray-500 tabular-nums">{stats.avgOriginal}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300" />
                  <div className="text-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={stats.avgCurrent}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <p className="text-xs text-indigo-500 font-medium uppercase">Current</p>
                        <p className="text-3xl font-bold text-indigo-600 tabular-nums">{stats.avgCurrent}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className={cn(
                    'px-3 py-1.5 rounded-full border',
                    stats.improvement > 0
                      ? 'bg-emerald-50 border-emerald-200'
                      : stats.improvement < 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                  )}>
                    <span className={cn(
                      'text-sm font-bold',
                      stats.improvement > 0
                        ? 'text-emerald-600'
                        : stats.improvement < 0
                          ? 'text-red-600'
                          : 'text-gray-500'
                    )}>
                      {stats.improvement > 0 ? '+' : ''}{stats.improvement} pts
                    </span>
                  </div>
                </div>

                {/* Stats badges */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-semibold text-emerald-600">{stats.acceptedCount}</span>/{stats.totalCount} accepted
                  </div>
                  {stats.totalKeywords > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Target className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-indigo-600">{stats.totalKeywords}</span> keywords
                    </div>
                  )}
                  {stats.totalGaps > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                      <span className="font-semibold text-violet-600">{stats.totalGaps}</span> gaps closed
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============================================================= */}
      {/* Tailoring Cards */}
      {/* ============================================================= */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Bullet Comparisons
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setBulletStates(prev => {
                    setScorePulse(true)
                    setTimeout(() => setScorePulse(false), 600)
                    return prev.map(s => ({ ...s, isAccepted: true }))
                  })
                }
              >
                Accept All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setBulletStates(prev => {
                    setScorePulse(true)
                    setTimeout(() => setScorePulse(false), 600)
                    return prev.map(s => ({ ...s, isAccepted: false }))
                  })
                }
              >
                Reject All
              </Button>
            </div>
          </div>

          {bulletStates.map((state, idx) => (
            <TailoringCard
              key={idx}
              index={idx}
              originalBullet={state.original}
              suggestedBullet={state.suggested}
              scoreDelta={state.analysis.scoreDelta}
              originalScore={state.analysis.originalScore}
              suggestedScore={state.analysis.suggestedScore}
              matchedKeywords={state.isAccepted ? state.analysis.matchedKeywords : []}
              gapsClosing={state.analysis.gapsClosing}
              isAccepted={state.isAccepted}
              onToggleAccept={handleToggleAccept}
              onEditSuggestion={handleEditSuggestion}
              onResync={handleResync}
              isResyncing={resyncingIndex === idx}
            />
          ))}
        </div>
      )}

      {/* ============================================================= */}
      {/* Final Output */}
      {/* ============================================================= */}
      {hasResults && (
        <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              Final CV Bullets
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Your selected bullet points ready to paste into your CV
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {bulletStates.map((state, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'text-sm leading-relaxed pl-3 border-l-2',
                    state.isAccepted
                      ? 'border-emerald-400 text-gray-800'
                      : 'border-gray-300 text-gray-500'
                  )}
                >
                  {state.isAccepted ? state.suggested : state.original}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFinal}
                className={cn(
                  'transition-all',
                  copied && 'bg-emerald-50 border-emerald-200 text-emerald-600'
                )}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <span className="text-xs text-gray-400">
                {bulletStates.filter(s => s.isAccepted).length} of {bulletStates.length} suggestions accepted
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
