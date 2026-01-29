'use client'

/**
 * Companion Chat Component - Premium Glassmorphism Design
 *
 * The main conversational interface with the AI companion.
 * This is not a chatbot - it's a trusted companion.
 * Features: Glassmorphic UI, animated gradient mesh, breathing avatar, floating input capsule.
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Send, Heart, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompanionChatProps {
  userId: string
  userName: string
  hasCheckedInToday: boolean
  todayContext: any
  streak: number
  totalCheckins: number
}

interface Message {
  role: 'user' | 'companion'
  content: string
  timestamp: Date
  suggestedGoal?: {
    goal: string
    type: string
  }
}

/**
 * Format timestamp in a friendly way (Just now, 5m ago, etc.)
 */
function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function CompanionChat({
  userId,
  userName,
  hasCheckedInToday,
  todayContext,
  streak,
  totalCheckins: _totalCheckins,
}: CompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const greeting = getInitialGreeting(userName, streak, hasCheckedInToday, todayContext)
    return [{
      role: 'companion',
      content: greeting,
      timestamp: new Date(),
    }]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }])

    try {
      const response = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId,
          conversationType: hasCheckedInToday ? 'general' : 'daily_checkin',
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      setMessages(prev => [...prev, {
        role: 'companion',
        content: data.message,
        timestamp: new Date(),
        suggestedGoal: data.suggestedGoal,
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'companion',
        content: "I'm having trouble connecting right now. But I'm still here with you. Can you try again in a moment?",
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoalAccept = async (goal: string) => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: `I'll do it: "${goal}"`,
      timestamp: new Date(),
    }])

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'companion',
        content: `That's the spirit! You've got this. When you've completed it, come back and tell me how it went. I'll be here.`,
        timestamp: new Date(),
      }])
    }, 500)
  }

  return (
    <div className="relative min-h-[600px] flex flex-col rounded-2xl overflow-hidden shadow-soft-lg">
      {/* Animated Gradient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-rose-light/40 via-peach-light/30 to-lavender-light/40 animate-gradient opacity-60" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-sky-light/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-radial from-rose-light/40 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Glass Container */}
      <div className="relative z-10 flex-1 flex flex-col bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40">
        {/* Header with Companion Avatar */}
        <div className="flex items-center gap-4 p-5 border-b border-white/30">
          {/* Breathing Avatar */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-rose via-peach to-lavender rounded-full animate-pulse-gentle" />
            <div className="relative w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center m-0.5">
              <Heart className="w-6 h-6 text-rose-dark" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Your Companion</h3>
            <p className="text-sm text-text-secondary">Always here for you</p>
          </div>
          {streak > 0 && (
            <div className="ml-auto px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full border border-rose-light/50">
              <span className="text-xs font-medium text-rose-dark">{streak} day streak</span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex opacity-0 animate-fade-up',
                message.role === 'user' ? 'justify-end' : 'justify-start',
                index > 0 && 'animation-delay-100'
              )}
              style={{ animationDelay: `${Math.min(index * 100, 300)}ms` }}
            >
              {message.role === 'companion' ? (
                /* Companion Message Bubble - Glass Effect */
                <div className="max-w-[85%] bg-white/80 backdrop-blur-md rounded-2xl rounded-bl-md p-4 shadow-soft border border-white/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-3.5 w-3.5 text-rose-dark" />
                    <span className="text-xs font-medium text-rose-dark">Companion</span>
                  </div>
                  <p className="whitespace-pre-wrap text-text-primary leading-relaxed">{message.content}</p>

                  {/* Suggested goal */}
                  {message.suggestedGoal && (
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-lavender-light/50 to-white/50 backdrop-blur-sm border border-lavender-light/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-lavender-dark" />
                        <span className="text-xs font-medium text-lavender-dark">
                          Today&apos;s micro-goal
                        </span>
                      </div>
                      <p className="text-sm text-text-primary mb-3">{message.suggestedGoal.goal}</p>
                      <Button
                        size="sm"
                        variant="success"
                        className="bg-success/90 hover:bg-success backdrop-blur-sm"
                        onClick={() => handleGoalAccept(message.suggestedGoal!.goal)}
                      >
                        I&apos;ll do it
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-text-tertiary mt-3">
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              ) : (
                /* User Message Bubble - Gradient */
                <div className="max-w-[85%] bg-gradient-to-br from-rose-light via-peach-light to-rose rounded-2xl rounded-br-md p-4 shadow-soft">
                  <p className="whitespace-pre-wrap text-text-primary leading-relaxed">{message.content}</p>
                  <p className="text-xs text-text-secondary/80 mt-3">
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-start opacity-0 animate-fade-up">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-bl-md p-4 shadow-soft border border-white/50">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-rose-dark animate-pulse-gentle" />
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-rose-light rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-rose-light rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-rose-light rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Capsule Input */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md rounded-full border border-white/50 shadow-soft-md p-2 pl-5 transition-all duration-300 hover:bg-white/80 hover:shadow-soft-lg focus-within:bg-white/85 focus-within:border-rose-light/50 focus-within:shadow-soft-lg">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Share how you're feeling..."
                className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-br from-rose via-rose-dark to-rose text-white shadow-soft hover:shadow-soft-md hover:scale-105 active:scale-95'
                    : 'bg-rose-light/50 text-text-tertiary cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function getInitialGreeting(
  userName: string,
  streak: number,
  hasCheckedInToday: boolean,
  _todayContext: any
): string {
  const firstName = userName.split(' ')[0]
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  if (hasCheckedInToday) {
    return `Hey ${firstName}, good to see you back today. We already checked in earlier, but I'm always here if you want to talk. How can I help?`
  }

  if (streak === 0) {
    return `Good ${timeGreeting}, ${firstName}!

I'm your companion on this journey. Job searching can feel lonely, but you don't have to do it alone.

How are you feeling today? Be honest—there's no wrong answer here.`
  }

  if (streak > 7) {
    return `Good ${timeGreeting}, ${firstName}!

${streak} days of checking in together. That's real commitment to yourself. I see you.

How are you doing today?`
  }

  return `Good ${timeGreeting}, ${firstName}!

Day ${streak + 1} of walking this path together. I'm glad you're here.

How are you feeling today?`
}
