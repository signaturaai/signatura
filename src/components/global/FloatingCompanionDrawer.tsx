'use client'

/**
 * Floating Companion Drawer
 *
 * A glassmorphic sliding chat drawer that appears when Siggy is clicked.
 * Context-aware: knows which page the user is viewing via currentPath prop.
 */

import { useState, useRef, useEffect } from 'react'
import { X, Send, Heart, Sparkles, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

interface FloatingCompanionDrawerProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  streak: number
  currentPath: string
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

function getContextAwareGreeting(userName: string, streak: number, currentPath: string): string {
  const firstName = userName.split(' ')[0]
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // Context-aware greetings based on current page
  const pageContexts: Record<string, string> = {
    '/cv': `I see you're working on your CV. Need help tailoring it for a specific role?`,
    '/cv/tailor': `Let's make your CV shine! I can help you highlight the right skills.`,
    '/applications': `Reviewing your applications? I'm here if you need to talk through any of them.`,
    '/interview': `Preparing for interviews? I can help you practice and build confidence.`,
    '/compensation': `Negotiating compensation can be stressful. Let me help you prepare.`,
    '/contract': `Reviewing a contract? I can help you understand what to look for.`,
    '/settings': `Taking care of account settings? Let me know if you need anything.`,
  }

  const contextMessage = pageContexts[currentPath] || `How can I support you right now?`

  if (streak === 0) {
    return `Good ${timeGreeting}, ${firstName}!

${contextMessage}`
  }

  return `Hey ${firstName}! ${streak} days strong together.

${contextMessage}`
}

export function FloatingCompanionDrawer({
  isOpen,
  onClose,
  userId,
  userName,
  streak,
  currentPath,
}: FloatingCompanionDrawerProps) {
  const [messages, setMessages] = useState<Message[]>(() => [{
    role: 'companion',
    content: getContextAwareGreeting(userName, streak, currentPath),
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update greeting when path changes
  useEffect(() => {
    if (isOpen && messages.length === 1) {
      setMessages([{
        role: 'companion',
        content: getContextAwareGreeting(userName, streak, currentPath),
        timestamp: new Date(),
      }])
    }
  }, [currentPath, isOpen, userName, streak, messages.length])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

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
          conversationType: 'general',
          context: { currentPath },
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
        content: "I'm having trouble connecting right now. But I'm still here. Try again in a moment?",
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoalAccept = (goal: string) => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: `I'll do it: "${goal}"`,
      timestamp: new Date(),
    }])

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'companion',
        content: `That's the spirit! You've got this. Come back and tell me how it went.`,
        timestamp: new Date(),
      }])
    }, 500)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]',
          'transition-all duration-300 ease-out',
          isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        )}
      >
        {/* Glassmorphic Container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-rose-light/40 via-peach-light/30 to-lavender-light/40 animate-gradient opacity-60" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-radial from-sky-light/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-radial from-rose-light/40 to-transparent rounded-full blur-3xl" />
          </div>

          {/* Glass Panel */}
          <div className="relative bg-white/70 backdrop-blur-xl border border-white/40">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/30">
              <div className="flex items-center gap-3">
                {/* Breathing Avatar */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose via-peach to-lavender rounded-full animate-pulse-gentle" />
                  <div className="relative w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center m-0.5">
                    <Heart className="w-5 h-5 text-rose-dark" />
                  </div>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">Siggy</h3>
                  <p className="text-xs text-text-secondary">Your AI Companion</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/50 hover:bg-white/70 flex items-center justify-center transition-colors"
                  aria-label="Minimize"
                >
                  <Minimize2 className="w-4 h-4 text-text-secondary" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/50 hover:bg-white/70 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[350px] overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex opacity-0 animate-fade-up',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                  style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
                >
                  {message.role === 'companion' ? (
                    <div className="max-w-[85%] bg-white/80 backdrop-blur-md rounded-2xl rounded-bl-md p-3 shadow-soft border border-white/50">
                      <p className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
                        {message.content}
                      </p>

                      {message.suggestedGoal && (
                        <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-lavender-light/50 to-white/50 border border-lavender-light/50">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-lavender-dark" />
                            <span className="text-xs font-medium text-lavender-dark">Micro-goal</span>
                          </div>
                          <p className="text-xs text-text-primary mb-2">{message.suggestedGoal.goal}</p>
                          <Button
                            size="sm"
                            variant="success"
                            className="text-xs h-7 bg-success/90 hover:bg-success"
                            onClick={() => handleGoalAccept(message.suggestedGoal!.goal)}
                          >
                            I&apos;ll do it
                          </Button>
                        </div>
                      )}

                      <p className="text-[10px] text-text-tertiary mt-2">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-[85%] bg-gradient-to-br from-rose-light via-peach-light to-rose rounded-2xl rounded-br-md p-3 shadow-soft">
                      <p className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
                        {message.content}
                      </p>
                      <p className="text-[10px] text-text-secondary/80 mt-2">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start opacity-0 animate-fade-up">
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-bl-md p-3 shadow-soft border border-white/50">
                    <div className="flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5 text-rose-dark animate-pulse-gentle" />
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-rose-light rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-rose-light rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-rose-light rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/30">
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full border border-white/50 shadow-soft p-1.5 pl-4 transition-all duration-300 focus-within:bg-white/80 focus-within:border-rose-light/50">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Share what's on your mind..."
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
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                      input.trim() && !isLoading
                        ? 'bg-gradient-to-br from-rose via-rose-dark to-rose text-white shadow-soft hover:shadow-soft-md hover:scale-105 active:scale-95'
                        : 'bg-rose-light/50 text-text-tertiary cursor-not-allowed'
                    )}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
