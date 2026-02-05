/**
 * InterviewHistory — Past interview sessions with scores and analytics
 *
 * Displays:
 * - Session date and type
 * - Company/position context
 * - Overall score with color coding
 * - Link to full analytics report
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Clock,
  ChevronRight,
  BarChart3,
  Play,
  Mic,
  FileText,
} from 'lucide-react'

export interface InterviewSession {
  id: string
  company_name: string
  position_title: string
  session_type: 'practice_questions' | 'mock_interview' | 'behavioral_prep' | 'technical_prep' | 'full_interview_simulation'
  overall_score: number
  session_duration: number // minutes
  questions_asked: number
  confidence_before: number
  confidence_after: number
  strengths: string[]
  improvements: string[]
  created_at: string
  job_application_id?: string
}

interface InterviewHistoryProps {
  sessions: InterviewSession[]
  onNewSession?: () => void
  limit?: number
}

const SESSION_TYPE_CONFIG: Record<InterviewSession['session_type'], { label: string; icon: typeof MessageSquare; color: string }> = {
  practice_questions: { label: 'Practice Q&A', icon: MessageSquare, color: 'bg-sky-100 text-sky-600' },
  mock_interview: { label: 'Mock Interview', icon: Play, color: 'bg-lavender-light/50 text-lavender-dark' },
  behavioral_prep: { label: 'Behavioral Prep', icon: Brain, color: 'bg-rose-light/50 text-rose-dark' },
  technical_prep: { label: 'Technical Prep', icon: FileText, color: 'bg-peach-light/50 text-peach-dark' },
  full_interview_simulation: { label: 'Full Simulation', icon: Mic, color: 'bg-emerald-100 text-emerald-600' },
}

/** Score color based on value */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-sky-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50'
  if (score >= 60) return 'bg-sky-50'
  if (score >= 40) return 'bg-amber-50'
  return 'bg-red-50'
}

/** Format duration */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

/** Format date */
function formatSessionDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Single session row */
function SessionRow({
  session,
  onClick,
}: {
  session: InterviewSession
  onClick: () => void
}) {
  const typeConfig = SESSION_TYPE_CONFIG[session.session_type]
  const TypeIcon = typeConfig.icon
  const confidenceDelta = session.confidence_after - session.confidence_before

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4 hover:shadow-md hover:border-lavender-light/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Type icon */}
        <div className={`flex-shrink-0 h-11 w-11 rounded-xl ${typeConfig.color} flex items-center justify-center`}>
          <TypeIcon className="h-5 w-5" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-gray-800 truncate">
              {typeConfig.label}
            </h3>
            <span className="text-xs text-gray-400">
              {formatSessionDate(session.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {session.company_name}
            </span>
            <span className="truncate">{session.position_title}</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center px-3">
          <div className={`px-3 py-1.5 rounded-lg ${getScoreBg(session.overall_score)}`}>
            <span className={`text-lg font-bold ${getScoreColor(session.overall_score)}`}>
              {Math.round(session.overall_score)}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">Score</span>
        </div>

        {/* Confidence delta */}
        <div className="hidden sm:flex flex-col items-center px-3 border-l border-gray-100">
          <div className="flex items-center gap-1">
            {confidenceDelta > 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : confidenceDelta < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-400" />
            ) : (
              <Target className="h-4 w-4 text-gray-400" />
            )}
            <span className={`text-sm font-semibold ${
              confidenceDelta > 0 ? 'text-emerald-600' : confidenceDelta < 0 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {confidenceDelta > 0 ? '+' : ''}{confidenceDelta}
            </span>
          </div>
          <span className="text-[10px] text-gray-400">Confidence</span>
        </div>

        {/* Meta */}
        <div className="hidden md:flex flex-col items-end text-right min-w-[70px]">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {session.questions_asked} Q&apos;s
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(session.session_duration)}
          </span>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-lavender-dark transition-colors" />
        </div>
      </div>

      {/* Strengths/Improvements preview */}
      {(session.strengths.length > 0 || session.improvements.length > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs">
          {session.strengths.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span>
              <span className="text-gray-500 truncate max-w-[150px]">
                {session.strengths[0]}
              </span>
            </div>
          )}
          {session.improvements.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500">→</span>
              <span className="text-gray-500 truncate max-w-[150px]">
                {session.improvements[0]}
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function InterviewHistory({ sessions, onNewSession, limit }: InterviewHistoryProps) {
  const router = useRouter()

  // Sort by date (most recent first) and optionally limit
  const sortedSessions = [...sessions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  // Stats
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.overall_score, 0) / sessions.length)
    : 0
  const totalMinutes = sessions.reduce((sum, s) => sum + s.session_duration, 0)
  const avgConfidenceGain = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.confidence_after - s.confidence_before), 0) / sessions.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Interview History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {sessions.length} sessions · {formatDuration(totalMinutes)} total · Avg score: {avgScore}
          </p>
        </div>
        {onNewSession && (
          <button
            onClick={onNewSession}
            className="px-3 py-1.5 rounded-lg border border-lavender text-lavender-dark text-xs font-medium hover:bg-lavender-light/20 transition-colors"
          >
            New Session
          </button>
        )}
      </div>

      {/* Quick stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 text-center">
            <span className={`text-xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</span>
            <p className="text-[10px] text-gray-400 uppercase mt-0.5">Avg Score</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 text-center">
            <span className="text-xl font-bold text-gray-700">{sessions.length}</span>
            <p className="text-[10px] text-gray-400 uppercase mt-0.5">Sessions</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 text-center">
            <span className={`text-xl font-bold ${avgConfidenceGain > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
              {avgConfidenceGain > 0 ? '+' : ''}{avgConfidenceGain}
            </span>
            <p className="text-[10px] text-gray-400 uppercase mt-0.5">Confidence</p>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {sortedSessions.length > 0 ? (
        <div className="space-y-3">
          {sortedSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onClick={() => router.push(`/interview/history/${session.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white/50 backdrop-blur-md rounded-2xl border border-white/40">
          <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">No interview sessions yet</p>
          <p className="text-sm text-gray-400">
            Practice makes perfect — start your first session
          </p>
          {onNewSession && (
            <button
              onClick={onNewSession}
              className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-rose to-lavender text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
            >
              Start Practice
            </button>
          )}
        </div>
      )}

      {/* View all link */}
      {limit && sessions.length > limit && (
        <button
          onClick={() => router.push('/interview/history')}
          className="w-full py-2.5 text-sm text-lavender-dark font-medium hover:bg-lavender-light/20 rounded-xl transition-colors flex items-center justify-center gap-1"
        >
          View All {sessions.length} Sessions
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
