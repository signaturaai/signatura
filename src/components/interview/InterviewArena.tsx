/**
 * InterviewArena — The high-stakes interview simulation screen.
 *
 * This isn't a chatbot. It's a simulation engine that:
 * - Displays an animated SVG avatar (conversational mode) or text HUD (traditional)
 * - Uses Hunter Logic to analyze responses in real-time
 * - Cross-references answers with JD and Narrative Anchor
 * - Adapts follow-up questions based on seniority gaps
 * - Tracks delivery metrics (pace, tone, confidence)
 */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Mic,
  MicOff,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  BarChart3,
  Brain,
  Zap,
  MessageSquare,
  X,
} from 'lucide-react'
import { InterviewerAvatar } from './InterviewerAvatar'
// Import directly from siggy-integration-guide to avoid pulling in server-only modules
import {
  analyzeResponseWithHunterLogic,
  generateHunterFollowUp,
  buildCharacterGuardrails,
  generateArenaQuestions,
  computeDeliveryMetrics,
} from '@/lib/ai/siggy-integration-guide'
import type {
  PreparedInterviewSession,
  ArenaMessage,
  ArenaQuestion,
  HunterAnalysis,
  CharacterGuardrails,
  InterviewerVisualState,
  DeliveryMetrics,
  HunterFollowUp,
} from '@/types/interview'

export interface InterviewArenaProps {
  session: PreparedInterviewSession
  narrativeAnchors: string[]
  onComplete: (messages: ArenaMessage[], averageScore: number) => void
  onExit: () => void
}

/** Dialogue bubble component */
function DialogueBubble({
  message,
  isLatest,
}: {
  message: ArenaMessage
  isLatest: boolean
}) {
  const isInterviewer = message.role === 'interviewer'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3 ${
          isInterviewer
            ? 'bg-white/80 backdrop-blur-md rounded-bl-md border border-white/40 shadow-sm'
            : 'bg-gradient-to-br from-rose-50 via-peach-50 to-rose-100 rounded-br-md border border-rose-100'
        } ${isLatest ? 'ring-2 ring-rose-200/50' : ''}`}
      >
        <p className="text-sm leading-relaxed text-gray-800">{message.content}</p>

        {/* Delivery metrics badge for candidate messages */}
        {message.delivery && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              <Clock className="h-3 w-3" />
              {message.delivery.wordsPerMinute} WPM
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${
                message.delivery.confidenceScore >= 70
                  ? 'text-emerald-600 bg-emerald-50'
                  : message.delivery.confidenceScore >= 40
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              <Target className="h-3 w-3" />
              {message.delivery.confidenceScore}% confidence
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              <MessageSquare className="h-3 w-3" />
              {message.delivery.detectedTone}
            </span>
          </div>
        )}

        {/* Hunter analysis indicator for interviewer follow-ups */}
        {message.hunterAnalysis && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">
                {message.hunterAnalysis.action === 'drill_down'
                  ? 'Probing deeper'
                  : message.hunterAnalysis.action === 'challenge'
                  ? 'Challenging seniority'
                  : message.hunterAnalysis.action === 'acknowledge'
                  ? 'Strong answer'
                  : 'Pivoting topic'}
              </span>
            </div>
          </div>
        )}

        <span className="block text-[10px] text-gray-400 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

/** Score dashboard sidebar */
function ScoreDashboard({
  averageScore,
  totalResponses,
  currentQuestion,
  totalQuestions,
  latestAnalysis,
}: {
  averageScore: number
  totalResponses: number
  currentQuestion: number
  totalQuestions: number
  latestAnalysis: HunterAnalysis | null
}) {
  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Progress</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {currentQuestion}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Average Score */}
      <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <BarChart3 className="inline h-3 w-3 mr-1" />
          Average Score
        </h3>
        <div className="flex items-end gap-2">
          <span
            className={`text-3xl font-bold ${
              averageScore >= 70 ? 'text-emerald-600' : averageScore >= 40 ? 'text-amber-600' : 'text-red-600'
            }`}
          >
            {totalResponses > 0 ? Math.round(averageScore) : '—'}
          </span>
          <span className="text-sm text-gray-500 mb-1">/100</span>
        </div>
      </div>

      {/* Latest Analysis */}
      {latestAnalysis && (
        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <Brain className="inline h-3 w-3 mr-1" />
            Last Analysis
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
                  latestAnalysis.action === 'acknowledge'
                    ? 'bg-emerald-50 text-emerald-600'
                    : latestAnalysis.action === 'challenge'
                    ? 'bg-red-50 text-red-600'
                    : latestAnalysis.action === 'drill_down'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {latestAnalysis.action === 'acknowledge' && <CheckCircle className="h-3 w-3" />}
                {latestAnalysis.action === 'challenge' && <AlertTriangle className="h-3 w-3" />}
                {latestAnalysis.action === 'drill_down' && <Target className="h-3 w-3" />}
                {latestAnalysis.action === 'pivot' && <ChevronRight className="h-3 w-3" />}
                {latestAnalysis.action.replace('_', ' ')}
              </span>
              <span className="text-sm font-semibold text-gray-700">
                {latestAnalysis.responseScore}/100
              </span>
            </div>

            {latestAnalysis.matchedKeywords.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 uppercase">Matched</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {latestAnalysis.matchedKeywords.slice(0, 4).map(k => (
                    <span
                      key={k}
                      className="text-[10px] bg-emerald-50 text-emerald-600 rounded px-1.5 py-0.5"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {latestAnalysis.missingKeywords.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 uppercase">Missing</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {latestAnalysis.missingKeywords.slice(0, 4).map(k => (
                    <span
                      key={k}
                      className="text-[10px] bg-red-50 text-red-600 rounded px-1.5 py-0.5"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {latestAnalysis.gapDetected && (
              <p className="text-xs text-amber-600 mt-1">{latestAnalysis.gapDescription}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Main Interview Arena Component */
export function InterviewArena({
  session,
  narrativeAnchors,
  onComplete,
  onExit,
}: InterviewArenaProps) {
  const isConversational = session.config.interviewMode === 'conversational'
  const isVoiceMode = session.config.answerFormat === 'voice'

  // Generate questions and guardrails
  const [questions] = useState<ArenaQuestion[]>(() => generateArenaQuestions(session, 8))
  const [guardrails] = useState<CharacterGuardrails>(() =>
    buildCharacterGuardrails(
      session.config.personality,
      session.config.extractedValues ? undefined : 'friendly'
    )
  )

  // Session state
  const [messages, setMessages] = useState<ArenaMessage[]>([])
  const [avatarState, setAvatarState] = useState<InterviewerVisualState>('idle')
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [drillDownCount, setDrillDownCount] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [responseCount, setResponseCount] = useState(0)
  const [latestAnalysis, setLatestAnalysis] = useState<HunterAnalysis | null>(null)
  const [isSessionComplete, setIsSessionComplete] = useState(false)

  // Input state
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null)

  // Ref for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Start with opening question
  useEffect(() => {
    if (messages.length === 0 && questions.length > 0) {
      const openingDelay = setTimeout(() => {
        setAvatarState('speaking')
        const openingMsg: ArenaMessage = {
          id: 'msg-opening',
          role: 'interviewer',
          content: questions[0].question,
          timestamp: new Date(),
          visualState: 'speaking',
        }
        setMessages([openingMsg])
        setResponseStartTime(Date.now())

        // Transition to listening after "speaking"
        const listenDelay = setTimeout(() => {
          setAvatarState('listening')
        }, 2000)
        return () => clearTimeout(listenDelay)
      }, 1000)
      return () => clearTimeout(openingDelay)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Handle candidate response submission */
  const handleSubmitResponse = useCallback(() => {
    if (!inputText.trim() || isSessionComplete) return

    const currentQ = questions[currentQuestionIdx]
    if (!currentQ) return

    // Calculate response duration
    const duration = responseStartTime
      ? Math.round((Date.now() - responseStartTime) / 1000)
      : undefined

    // Compute delivery metrics
    const delivery: DeliveryMetrics = computeDeliveryMetrics(inputText, duration)

    // Add candidate message
    const candidateMsg: ArenaMessage = {
      id: `msg-candidate-${Date.now()}`,
      role: 'candidate',
      content: inputText,
      timestamp: new Date(),
      delivery,
    }
    setMessages(prev => [...prev, candidateMsg])
    setInputText('')

    // === THINKING STATE — The magic happens here ===
    setAvatarState('thinking')

    // Hunter Logic analysis
    const analysis = analyzeResponseWithHunterLogic(
      inputText,
      currentQ.targetKeywords,
      narrativeAnchors,
      currentQ.expectedSeniority,
      drillDownCount,
      guardrails.maxDrillDowns
    )

    setLatestAnalysis(analysis)
    setTotalScore(prev => prev + analysis.responseScore)
    setResponseCount(prev => prev + 1)

    // Generate follow-up after "thinking" delay
    const thinkingDelay = setTimeout(() => {
      setAvatarState('speaking')

      const followUp: HunterFollowUp = generateHunterFollowUp(analysis, currentQ.question, guardrails)

      // Decide next action
      if (analysis.action === 'drill_down' || analysis.action === 'challenge') {
        // Follow up on same question
        setDrillDownCount(prev => prev + 1)

        const followUpMsg: ArenaMessage = {
          id: `msg-interviewer-${Date.now()}`,
          role: 'interviewer',
          content: followUp.question,
          timestamp: new Date(),
          visualState: 'speaking',
          hunterAnalysis: analysis,
        }
        setMessages(prev => [...prev, followUpMsg])
      } else {
        // Move to next question or end
        const nextIdx = currentQuestionIdx + 1
        if (nextIdx >= questions.length) {
          // Session complete
          const closingMsg: ArenaMessage = {
            id: `msg-closing-${Date.now()}`,
            role: 'interviewer',
            content: 'Thank you for your responses. That concludes our interview. You\'ll find a detailed analysis of your performance in the results.',
            timestamp: new Date(),
            visualState: 'speaking',
            hunterAnalysis: analysis,
          }
          setMessages(prev => {
            const updated = [...prev, closingMsg]
            // Trigger completion callback
            const avgScore = responseCount > 0 ? (totalScore + analysis.responseScore) / (responseCount + 1) : analysis.responseScore
            setTimeout(() => onComplete(updated, avgScore), 2000)
            return updated
          })
          setIsSessionComplete(true)
        } else {
          // Acknowledge and ask next question
          const nextQ = questions[nextIdx]
          const transitionMsg: ArenaMessage = {
            id: `msg-interviewer-${Date.now()}`,
            role: 'interviewer',
            content: followUp.question + ' ' + nextQ.question,
            timestamp: new Date(),
            visualState: 'speaking',
            hunterAnalysis: analysis,
          }
          setMessages(prev => [...prev, transitionMsg])
          setCurrentQuestionIdx(nextIdx)
          setDrillDownCount(0)
        }
      }

      setResponseStartTime(Date.now())

      // Transition to listening
      const listenDelay = setTimeout(() => {
        if (!isSessionComplete) {
          setAvatarState('listening')
        }
      }, 1500)
      return () => clearTimeout(listenDelay)
    }, 2000) // 2 second "thinking" delay for cross-referencing

    return () => clearTimeout(thinkingDelay)
  }, [
    inputText,
    isSessionComplete,
    questions,
    currentQuestionIdx,
    responseStartTime,
    narrativeAnchors,
    drillDownCount,
    guardrails,
    responseCount,
    totalScore,
    onComplete,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitResponse()
    }
  }

  const toggleRecording = () => {
    setIsRecording(prev => !prev)
    // Voice recording is a placeholder — in production this would use Web Speech API
  }

  const averageScore = responseCount > 0 ? totalScore / responseCount : 0
  const persona = session.config.extractedValues
    ? undefined
    : 'friendly'

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-rose-50/30 via-white to-lavender-50/30">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Interview Arena</h2>
              <p className="text-xs text-gray-500">
                {session.config.interviewType.replace(/_/g, ' ')} &middot;{' '}
                {session.config.difficultyLevel} &middot;{' '}
                {isConversational ? 'Conversational' : 'Traditional'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Scoring mode badge */}
            <span
              className={`text-xs font-medium rounded-full px-3 py-1 ${
                session.scoringMode === 'content_and_delivery'
                  ? 'bg-purple-50 text-purple-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {session.scoringMode === 'content_and_delivery' ? 'Content + Delivery' : 'Content Only'}
            </span>

            <button
              onClick={onExit}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Exit interview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dialogue area */}
        <div className="flex-1 flex flex-col">
          {/* Avatar area (conversational mode) */}
          {isConversational && (
            <div className="flex-shrink-0 flex justify-center py-6 border-b border-gray-100/50">
              <InterviewerAvatar
                state={avatarState}
                size={140}
                persona={persona}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <DialogueBubble
                  key={msg.id}
                  message={msg}
                  isLatest={idx === messages.length - 1}
                />
              ))}
            </AnimatePresence>

            {/* Thinking indicator */}
            {avatarState === 'thinking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start mb-4"
              >
                <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-bl-md border border-amber-200/60 shadow-sm px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-600">Analyzing response against JD & narrative...</span>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-amber-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {!isSessionComplete && (
            <div className="flex-shrink-0 border-t border-gray-100/50 bg-white/50 backdrop-blur-sm px-6 py-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      avatarState === 'thinking'
                        ? 'Interviewer is analyzing...'
                        : 'Type your response... (Enter to send, Shift+Enter for new line)'
                    }
                    disabled={avatarState === 'thinking'}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Voice toggle (voice mode) */}
                {isVoiceMode && (
                  <button
                    onClick={toggleRecording}
                    className={`flex-shrink-0 p-3 rounded-xl transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                )}

                {/* Send button */}
                <button
                  onClick={handleSubmitResponse}
                  disabled={!inputText.trim() || avatarState === 'thinking'}
                  className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 text-white shadow-md shadow-rose-200 hover:shadow-lg hover:shadow-rose-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>

              {/* Word count indicator */}
              {inputText.length > 0 && (
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>{inputText.split(/\s+/).filter(Boolean).length} words</span>
                  {inputText.split(/\s+/).filter(Boolean).length < 20 && (
                    <span className="text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Consider elaborating for a stronger answer
                    </span>
                  )}
                  {inputText.split(/\s+/).filter(Boolean).length > 200 && (
                    <span className="text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Consider being more concise
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Session complete banner */}
          {isSessionComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-shrink-0 border-t border-emerald-200 bg-emerald-50/80 backdrop-blur-sm px-6 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Interview Complete</p>
                    <p className="text-xs text-emerald-600">
                      Average Score: {Math.round(averageScore)}/100 &middot;{' '}
                      {responseCount} responses analyzed
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onComplete(messages, averageScore)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  View Results
                  <TrendingUp className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Score sidebar (traditional mode shows this always, conversational shows it collapsed) */}
        <div
          className={`flex-shrink-0 border-l border-gray-100/50 bg-gray-50/30 overflow-y-auto p-4 ${
            isConversational ? 'w-64 hidden lg:block' : 'w-72'
          }`}
        >
          <ScoreDashboard
            averageScore={averageScore}
            totalResponses={responseCount}
            currentQuestion={currentQuestionIdx + 1}
            totalQuestions={questions.length}
            latestAnalysis={latestAnalysis}
          />

          {/* Session brief */}
          <div className="mt-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Session Brief</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{session.sessionBrief}</p>
          </div>

          {/* Narrative anchors */}
          {narrativeAnchors.length > 0 && (
            <div className="mt-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Narrative Anchors
              </h3>
              <div className="space-y-1">
                {narrativeAnchors.map((anchor, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Target className="h-3 w-3 text-rose-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{anchor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
