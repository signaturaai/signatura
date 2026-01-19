'use client'

/**
 * Companion Chat Component
 *
 * The main conversational interface with the AI companion.
 * This is not a chatbot - it's a trusted companion.
 * Uses the warm, empathetic Signatura color palette.
 */

import { useState, useRef, useEffect } from 'react'
import { Button, Textarea, Card, CardContent } from '@/components/ui'
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

export function CompanionChat({
  userId,
  userName,
  hasCheckedInToday,
  todayContext,
  streak,
  totalCheckins,
}: CompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Initialize with context-aware greeting
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

    // Add user message
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

      // Add companion response
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

    // TODO: Store goal acceptance
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'companion',
        content: `That's the spirit! You've got this. When you've completed it, come back and tell me how it went. I'll be here.`,
        timestamp: new Date(),
      }])
    }, 500)
  }

  return (
    <Card className="min-h-[500px] flex flex-col bg-white shadow-soft-md border-rose-light/30">
      <CardContent className="flex-1 flex flex-col p-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex animate-fade-up',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl p-4 shadow-soft',
                  message.role === 'user'
                    ? 'user-message rounded-br-md'
                    : 'companion-message rounded-bl-md'
                )}
              >
                {message.role === 'companion' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-rose-dark" />
                    <span className="text-xs font-medium text-rose-dark">
                      Your Companion
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-text-primary">{message.content}</p>

                {/* Suggested goal */}
                {message.suggestedGoal && (
                  <div className="mt-4 p-4 rounded-xl bg-white/70 border border-lavender-light">
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
                      onClick={() => handleGoalAccept(message.suggestedGoal!.goal)}
                    >
                      I&apos;ll do it
                    </Button>
                  </div>
                )}

                <p className="text-xs text-text-tertiary mt-2">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fade-up">
              <div className="companion-message rounded-2xl rounded-bl-md p-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-dark animate-pulse-soft" />
                  <span className="text-sm text-text-secondary">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share how you're feeling..."
            className="min-h-[60px] resize-none rounded-xl border-rose-light focus:border-rose focus:ring-rose/30 bg-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[60px] w-[60px] bg-rose hover:bg-rose-dark text-white shadow-soft"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function getInitialGreeting(
  userName: string,
  streak: number,
  hasCheckedInToday: boolean,
  todayContext: any
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
