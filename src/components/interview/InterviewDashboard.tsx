'use client'

/**
 * Interview Dashboard
 *
 * Displays the generated interview plan with:
 * - Strategy brief
 * - Questions with hidden agenda (accordion view)
 * - Actions to regenerate or start new configuration
 */

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  Target,
  Lightbulb,
  MessageSquare,
  User,
  Sparkles,
  BookOpen,
  AlertCircle,
  Clock,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InterviewPlan, InterviewQuestion } from '@/types/interview'
import { INTERVIEW_TYPES as TYPES } from '@/types/interview'

interface InterviewDashboardProps {
  plan: InterviewPlan
  onRegenerate: () => void
  onNewConfig: () => void
  isRegenerating?: boolean
}

function QuestionCard({
  question,
  index,
}: {
  question: InterviewQuestion
  index: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const categoryColors = {
    standard: 'bg-gray-100 text-gray-700',
    tailored: 'bg-rose-light text-rose-dark',
    persona: 'bg-lavender-light text-lavender-dark',
  }

  const difficultyColors = {
    easy: 'text-green-600',
    medium: 'text-yellow-600',
    hard: 'text-red-600',
  }

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        isExpanded ? 'shadow-soft border-rose/30' : 'border-gray-200'
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                categoryColors[question.category]
              )}
            >
              {question.category === 'tailored' ? 'CV-Tailored' : question.category}
            </span>
            <span className={cn('text-xs', difficultyColors[question.difficulty])}>
              {question.difficulty}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {question.timeEstimate}
            </span>
          </div>
          <p className="font-medium text-gray-900 pr-8">{question.question}</p>
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 bg-gray-50/50">
          {/* Hidden Agenda */}
          <div className="pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="h-4 w-4 text-rose" />
              Hidden Agenda (What they&apos;re really asking)
            </div>
            <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
              {question.hiddenAgenda}
            </p>
          </div>

          {/* Suggested Answer Structure */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Suggested Answer Structure (STAR)
            </div>
            <div className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200 whitespace-pre-line">
              {question.suggestedStructure}
            </div>
          </div>

          {/* Related CV Section */}
          {question.relatedCVSection && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                Related CV Section
              </div>
              <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
                {question.relatedCVSection}
              </p>
            </div>
          )}

          {/* Keywords */}
          {question.keywords && question.keywords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Star className="h-4 w-4 text-purple-500" />
                Keywords to Include
              </div>
              <div className="flex flex-wrap gap-1">
                {question.keywords.map(keyword => (
                  <span
                    key={keyword}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function InterviewDashboard({
  plan,
  onRegenerate,
  onNewConfig,
  isRegenerating = false,
}: InterviewDashboardProps) {
  const interviewType = TYPES.find(t => t.value === plan.config.interviewType)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-rose-light flex items-center justify-center">
              <User className="h-6 w-6 text-rose" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Interview with {plan.interviewerProfile.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                  {interviewType?.label || plan.config.interviewType}
                </span>
                <span>•</span>
                <span>{plan.questions.length} questions</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isRegenerating && 'animate-spin')}
            />
            Regenerate
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewConfig}>
            <Settings className="h-4 w-4 mr-2" />
            New Config
          </Button>
        </div>
      </div>

      {/* Interviewer Profile */}
      <Card className="shadow-soft border-lavender/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-lavender" />
            Interviewer Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-lavender-light rounded-full text-lavender-dark">
              {plan.interviewerProfile.inferredStyle}
            </span>
            {plan.interviewerProfile.derivedFrom === 'linkedin_analysis' && (
              <span className="text-xs px-2 py-1 bg-blue-100 rounded-full text-blue-700 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Analyzed
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Communication Preferences</p>
              <ul className="space-y-1">
                {plan.interviewerProfile.communicationPreferences.map((pref, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose">•</span>
                    <span>{pref}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Likely Priorities</p>
              <ul className="space-y-1">
                {plan.interviewerProfile.likelyPriorities.map((priority, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose">•</span>
                    <span>{priority}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {plan.interviewerProfile.potentialBiases.length > 0 && (
            <div className="text-sm">
              <p className="text-gray-500 mb-1">Watch Out For</p>
              <div className="flex flex-wrap gap-1">
                {plan.interviewerProfile.potentialBiases.map((bias, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full"
                  >
                    {bias}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Brief */}
      <Card className="shadow-soft border-rose/30 bg-rose-light/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-rose" />
            Your Strategy Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{plan.strategyBrief}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Key Tactics:</p>
            <ul className="space-y-2">
              {plan.keyTactics.map((tactic, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <Sparkles className="h-4 w-4 text-rose mt-0.5 flex-shrink-0" />
                  <span>{tactic}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            Interview Questions
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
              Standard
            </span>
            <span className="px-2 py-1 bg-rose-light text-rose-dark rounded-full">
              CV-Tailored
            </span>
            <span className="px-2 py-1 bg-lavender-light text-lavender-dark rounded-full">
              Persona
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {plan.questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} />
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t">
        <Button variant="companion" size="lg">
          <Target className="h-4 w-4 mr-2" />
          Start Practice Session
        </Button>
      </div>
    </div>
  )
}

export default InterviewDashboard
