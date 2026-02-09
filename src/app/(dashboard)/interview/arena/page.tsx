/**
 * Interview Arena Page
 *
 * The high-stakes interview simulation screen.
 * Receives session configuration and runs the interactive interview
 * with Hunter Logic, delivery tracking, and real-time analysis.
 */
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  ArrowLeft,
  Trophy,
  Target,
  BarChart3,
  Brain,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { InterviewArena } from '@/components/interview'
// Import directly from siggy-integration-guide to avoid pulling in server-only memory.ts
import { prepareInterviewSession } from '@/lib/ai/siggy-integration-guide'
import type {
  PreparedInterviewSession,
  ArenaMessage,
  StrategicWizardConfig,
} from '@/types/interview'
import { DEFAULT_PERSONALITY } from '@/types/interview'

type PagePhase = 'setup' | 'arena' | 'results'

/** Mock session for demo — in production this comes from the wizard */
function createDemoSession(): PreparedInterviewSession {
  const config: StrategicWizardConfig = {
    interviewType: 'hiring_manager',
    difficultyLevel: 'senior',
    personality: { ...DEFAULT_PERSONALITY, intensity: 60, directness: 65 },
    interviewMode: 'conversational',
    answerFormat: 'text',
    userEmphases: 'product strategy, cross-functional leadership, data-driven decisions',
    interviewerLinkedIn: '',
    extractedValues: null,
  }

  return prepareInterviewSession(
    config,
    {
      targetRole: 'Senior Product Manager',
      seniorityLevel: 'senior',
      coreStrength: 'strategic-leadership',
      painPoint: 'Demonstrating executive presence while staying hands-on technical',
      desiredBrand: 'Data-driven product leader who scales teams and ships outcomes',
    },
    [
      'Led cross-functional team of 12 to deliver platform redesign',
      'Drove 40% increase in user engagement through data-driven experiments',
      'Defined product roadmap aligning with company OKRs',
    ],
    'Senior Product Manager role requiring strategic thinking, cross-functional leadership, and data-driven decision making. Must demonstrate experience scaling products and leading teams.'
  )
}

/** Results summary component */
function ResultsSummary({
  messages,
  averageScore,
  onRestart,
  onExit,
}: {
  messages: ArenaMessage[]
  averageScore: number
  onRestart: () => void
  onExit: () => void
}) {
  const candidateMessages = messages.filter(m => m.role === 'candidate')
  const interviewerMessages = messages.filter(m => m.role === 'interviewer')
  const hunterAnalyses = interviewerMessages
    .filter(m => m.hunterAnalysis)
    .map(m => m.hunterAnalysis!)

  const drillDowns = hunterAnalyses.filter(a => a.action === 'drill_down').length
  const challenges = hunterAnalyses.filter(a => a.action === 'challenge').length
  const acknowledges = hunterAnalyses.filter(a => a.action === 'acknowledge').length

  // Aggregate delivery metrics
  const deliveries = candidateMessages.filter(m => m.delivery).map(m => m.delivery!)
  const avgConfidence = deliveries.length > 0
    ? Math.round(deliveries.reduce((sum, d) => sum + d.confidenceScore, 0) / deliveries.length)
    : 0
  const avgWPM = deliveries.length > 0
    ? Math.round(deliveries.reduce((sum, d) => sum + d.wordsPerMinute, 0) / deliveries.length)
    : 0

  // Tone distribution
  const toneDistribution = deliveries.reduce<Record<string, number>>((acc, d) => {
    acc[d.detectedTone] = (acc[d.detectedTone] || 0) + 1
    return acc
  }, {})
  const dominantTone = Object.entries(toneDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  const scoreColor = averageScore >= 70 ? 'text-emerald-600' : averageScore >= 40 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = averageScore >= 70 ? 'from-emerald-50 to-emerald-100' : averageScore >= 40 ? 'from-amber-50 to-amber-100' : 'from-red-50 to-red-100'
  const scoreLabel = averageScore >= 70 ? 'Strong Performance' : averageScore >= 40 ? 'Needs Improvement' : 'Significant Gaps'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-8 space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 mx-auto">
          <Trophy className="h-8 w-8 text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Interview Results</h1>
        <p className="text-gray-500">{candidateMessages.length} responses analyzed by Hunter Logic</p>
      </div>

      {/* Overall Score */}
      <div className={`bg-gradient-to-br ${scoreBg} rounded-2xl border border-white/60 p-8 text-center`}>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Overall Score</p>
        <p className={`text-6xl font-bold ${scoreColor}`}>{Math.round(averageScore)}</p>
        <p className={`text-lg font-medium ${scoreColor} mt-1`}>{scoreLabel}</p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4 text-center">
          <MessageSquare className="h-5 w-5 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800">{candidateMessages.length}</p>
          <p className="text-xs text-gray-500">Responses</p>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4 text-center">
          <Target className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800">{avgConfidence}%</p>
          <p className="text-xs text-gray-500">Avg Confidence</p>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4 text-center">
          <Clock className="h-5 w-5 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800">{avgWPM}</p>
          <p className="text-xs text-gray-500">Avg WPM</p>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4 text-center">
          <Brain className="h-5 w-5 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 capitalize">{dominantTone}</p>
          <p className="text-xs text-gray-500">Dominant Tone</p>
        </div>
      </div>

      {/* Hunter Logic breakdown */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-500" />
          Hunter Logic Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-emerald-50">
            <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald-700">{acknowledges}</p>
            <p className="text-xs text-emerald-600">Acknowledged</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-amber-50">
            <Target className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-700">{drillDowns}</p>
            <p className="text-xs text-amber-600">Drill-Downs</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-700">{challenges}</p>
            <p className="text-xs text-red-600">Challenges</p>
          </div>
        </div>
      </div>

      {/* Response-by-response timeline */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Response Timeline
        </h3>
        <div className="space-y-3">
          {hunterAnalyses.map((analysis, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50"
            >
              <span className="text-xs font-semibold text-gray-400 w-6">#{idx + 1}</span>
              <div className="flex-1">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.responseScore >= 70
                        ? 'bg-emerald-400'
                        : analysis.responseScore >= 40
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                    style={{ width: `${analysis.responseScore}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                {analysis.responseScore}
              </span>
              <span
                className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                  analysis.action === 'acknowledge'
                    ? 'bg-emerald-50 text-emerald-600'
                    : analysis.action === 'challenge'
                    ? 'bg-red-50 text-red-600'
                    : analysis.action === 'drill_down'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {analysis.action.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onExit}
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Interview Coach
        </button>
        <button
          onClick={onRestart}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 text-white font-medium shadow-md shadow-rose-200 hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </motion.div>
  )
}

export default function InterviewArenaPage() {
  const [phase, setPhase] = useState<PagePhase>('setup')
  const [session, setSession] = useState<PreparedInterviewSession | null>(null)
  const [resultMessages, setResultMessages] = useState<ArenaMessage[]>([])
  const [resultScore, setResultScore] = useState(0)

  const handleStartArena = () => {
    const demoSession = createDemoSession()
    setSession(demoSession)
    setPhase('arena')
  }

  const handleComplete = (messages: ArenaMessage[], avgScore: number) => {
    setResultMessages(messages)
    setResultScore(avgScore)
    setPhase('results')
  }

  const handleRestart = () => {
    setSession(null)
    setResultMessages([])
    setResultScore(0)
    setPhase('setup')
  }

  const handleExit = () => {
    setPhase('setup')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/30 via-white to-lavender-50/30">
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto px-6 py-16 text-center space-y-8"
          >
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 mx-auto">
              <Zap className="h-10 w-10 text-rose-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Arena</h1>
              <p className="text-gray-500 max-w-md mx-auto">
                A high-stakes simulation with real-time Hunter Logic analysis.
                Every response is cross-referenced against your target role and narrative.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4">
                <Brain className="h-5 w-5 text-amber-500 mb-2" />
                <h3 className="text-sm font-semibold text-gray-700">Hunter Logic</h3>
                <p className="text-xs text-gray-500 mt-1">
                  AI analyzes every response for keyword coverage, seniority signals, and narrative alignment.
                </p>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4">
                <Target className="h-5 w-5 text-rose-500 mb-2" />
                <h3 className="text-sm font-semibold text-gray-700">Adaptive Follow-Ups</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Drill-downs and challenge questions when your answers do not match the required level.
                </p>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4">
                <BarChart3 className="h-5 w-5 text-blue-500 mb-2" />
                <h3 className="text-sm font-semibold text-gray-700">Delivery Tracking</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Real-time metrics on pace, confidence, tone, and filler word usage.
                </p>
              </div>
            </div>

            <button
              onClick={handleStartArena}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 text-white font-semibold text-lg shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all active:scale-95 flex items-center gap-3 mx-auto"
            >
              <Zap className="h-5 w-5" />
              Enter the Arena
            </button>
          </motion.div>
        )}

        {phase === 'arena' && session && (
          <motion.div
            key="arena"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
          >
            <InterviewArena
              session={session}
              narrativeAnchors={session.narrativeAnchors}
              onComplete={handleComplete}
              onExit={handleExit}
            />
          </motion.div>
        )}

        {phase === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultsSummary
              messages={resultMessages}
              averageScore={resultScore}
              onRestart={handleRestart}
              onExit={handleExit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
