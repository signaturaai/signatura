'use client'

/**
 * Interview Simulation Board
 *
 * A gamified "Hot Seat" experience that transforms the interview plan
 * into an engaging Active Recall UI where insights are hidden until requested.
 */

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  Brain,
  Lightbulb,
  Lock,
  Unlock,
  ChevronRight,
  Target,
  Sparkles,
  Clock,
  Flame,
  Zap,
  Eye,
  EyeOff,
  Trophy,
  User,
  RefreshCw,
  Settings,
  MessageCircle,
  Shield,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InterviewPlan, InterviewQuestion } from '@/types/interview'
import { INTERVIEW_TYPES as TYPES } from '@/types/interview'

interface InterviewSimulationBoardProps {
  plan: InterviewPlan
  onRegenerate: () => void
  onNewConfig: () => void
  isRegenerating?: boolean
}

// Difficulty icons and colors
const difficultyConfig = {
  easy: {
    icon: Zap,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'Warm-up',
  },
  medium: {
    icon: Flame,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    label: 'Standard',
  },
  hard: {
    icon: Trophy,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Challenge',
  },
}

// Category badges
const categoryConfig = {
  standard: {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Standard',
  },
  tailored: {
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    label: 'CV-Tailored',
  },
  persona: {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    label: 'Persona-Based',
  },
}

function QuestionHotSeat({
  question,
  index,
  totalQuestions,
}: {
  question: InterviewQuestion
  index: number
  totalQuestions: number
}) {
  const [isRevealed, setIsRevealed] = useState(false)
  const difficulty = difficultyConfig[question.difficulty] || difficultyConfig.medium
  const category = categoryConfig[question.category] || categoryConfig.standard
  const DifficultyIcon = difficulty.icon

  // Parse talking points from suggestedStructure (STAR format)
  const talkingPoints = question.suggestedStructure
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.trim())

  return (
    <div
      className={cn(
        'group relative rounded-2xl border-2 transition-all duration-300 overflow-hidden',
        isRevealed
          ? 'border-rose/40 bg-gradient-to-br from-white to-rose-50/30 shadow-lg'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      )}
    >
      {/* Question Number Badge */}
      <div className="absolute -top-0 -left-0 w-12 h-12 overflow-hidden">
        <div
          className={cn(
            'absolute top-0 left-0 w-16 h-16 -translate-x-4 -translate-y-4 rotate-0 flex items-end justify-end',
            isRevealed ? 'bg-rose' : 'bg-gray-800'
          )}
          style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        >
          <span className="text-white text-xs font-bold absolute top-5 left-2">
            {index + 1}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 pl-14">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Badge */}
            <span
              className={cn(
                'text-xs px-2.5 py-1 rounded-full font-medium border',
                category.color
              )}
            >
              {category.label}
            </span>

            {/* Difficulty Badge */}
            <span
              className={cn(
                'text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1',
                difficulty.bg,
                difficulty.color
              )}
            >
              <DifficultyIcon className="h-3 w-3" />
              {difficulty.label}
            </span>

            {/* Time Estimate */}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {question.timeEstimate}
            </span>
          </div>

          {/* Progress indicator */}
          <span className="text-xs text-gray-400 font-medium">
            {index + 1}/{totalQuestions}
          </span>
        </div>

        {/* Question Text */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4 leading-relaxed">
          {question.question}
        </h3>

        {/* Reveal Button */}
        {!isRevealed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRevealed(true)}
            className="group/btn border-dashed border-2 border-gray-300 hover:border-rose hover:bg-rose-light/20 transition-all"
          >
            <Lock className="h-4 w-4 mr-2 group-hover/btn:hidden" />
            <Unlock className="h-4 w-4 mr-2 hidden group-hover/btn:block text-rose" />
            <span>Reveal Coach Insights</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Hidden Agenda */}
            <div className="relative">
              <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-amber-600" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
                  <Eye className="h-4 w-4" />
                  Why they&apos;re asking this:
                </div>
                <p className="text-sm text-amber-900/80 leading-relaxed">
                  {question.hiddenAgenda}
                </p>
              </div>
            </div>

            {/* Talking Points */}
            <div className="relative">
              <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-3">
                  <MessageCircle className="h-4 w-4" />
                  Key Talking Points (STAR):
                </div>
                <ul className="space-y-2">
                  {talkingPoints.map((point, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-emerald-900/80"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Keywords */}
            {question.keywords && question.keywords.length > 0 && (
              <div className="relative">
                <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Star className="h-4 w-4 text-purple-600" />
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 mb-2">
                    <Sparkles className="h-4 w-4" />
                    Power Words to Include:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {question.keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1.5 bg-purple-200/60 text-purple-800 rounded-full font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRevealed(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Insights
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function InterviewSimulationBoard({
  plan,
  onRegenerate,
  onNewConfig,
  isRegenerating = false,
}: InterviewSimulationBoardProps) {
  const [revealedCount, setRevealedCount] = useState(0)
  const interviewType = TYPES.find(t => t.value === plan.config.interviewType)

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                <User className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">Interview Simulation</h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose/80 text-white">
                    HOT SEAT
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <span className="font-medium text-white">
                    {plan.interviewerProfile.name}
                  </span>
                  <span>•</span>
                  <span>{interviewType?.label}</span>
                  <span>•</span>
                  <span>{plan.questions.length} Questions</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <RefreshCw
                  className={cn('h-4 w-4 mr-2', isRegenerating && 'animate-spin')}
                />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNewConfig}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4 mr-2" />
                New Setup
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Card */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-amber-900">
            <div className="h-10 w-10 rounded-xl bg-amber-200 flex items-center justify-center">
              <Brain className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <span className="text-lg">Strategy Brief</span>
              <p className="text-xs font-normal text-amber-700 mt-0.5">
                Your winning approach for this interview
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-amber-900 leading-relaxed text-base">
            {plan.strategyBrief}
          </p>

          {/* Key Tactics */}
          <div className="pt-2 border-t border-amber-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-3">
              <Target className="h-4 w-4" />
              Key Tactics:
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {plan.keyTactics.map((tactic, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-amber-900/80 bg-white/50 rounded-lg p-2.5"
                >
                  <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span>{tactic}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interviewer Intel */}
      <Card className="border border-purple-200 bg-gradient-to-br from-purple-50/50 to-lavender-light/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-purple-900">
            <div className="h-10 w-10 rounded-xl bg-purple-200 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <span className="text-lg">Interviewer Intel</span>
              <p className="text-xs font-normal text-purple-700 mt-0.5">
                {plan.interviewerProfile.derivedFrom === 'linkedin_analysis'
                  ? 'AI-analyzed from LinkedIn profile'
                  : 'Based on persona archetype'}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-purple-800 mb-2">Style</p>
              <span className="inline-block px-3 py-1.5 bg-purple-200/60 text-purple-900 rounded-lg font-medium">
                {plan.interviewerProfile.inferredStyle}
              </span>
            </div>
            <div>
              <p className="font-medium text-purple-800 mb-2">They Value</p>
              <ul className="space-y-1 text-purple-900/80">
                {plan.interviewerProfile.likelyPriorities.slice(0, 3).map((p, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-purple-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-purple-800 mb-2">Watch For</p>
              <ul className="space-y-1 text-purple-900/80">
                {plan.interviewerProfile.potentialBiases.slice(0, 2).map((b, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Flame className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">The Hot Seat</h2>
              <p className="text-sm text-gray-500">
                Click each question to reveal coach insights
              </p>
            </div>
          </div>

          {/* Question Type Legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {Object.entries(categoryConfig).map(([key, config]) => (
              <span
                key={key}
                className={cn('px-2 py-1 rounded-full border', config.color)}
              >
                {config.label}
              </span>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4 relative">
          {/* Connection Line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 hidden sm:block" />

          {plan.questions.map((question, index) => (
            <QuestionHotSeat
              key={question.id}
              question={question}
              index={index}
              totalQuestions={plan.questions.length}
            />
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="flex flex-col items-center justify-center gap-4 pt-6 border-t">
        <p className="text-gray-500 text-sm text-center">
          Ready to practice? Start a mock interview session.
        </p>
        <Button variant="companion" size="lg" className="px-8">
          <Flame className="h-5 w-5 mr-2" />
          Start Practice Session
        </Button>
      </div>
    </div>
  )
}

export default InterviewSimulationBoard
