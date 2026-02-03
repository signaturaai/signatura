'use client'

/**
 * Authenticity Feedback Widget — "The Refine Step"
 *
 * Asks the user: "Does this new narrative feel authentic to you?"
 * - If Yes → celebration + proceed
 * - If No → dropdown to nudge tone + one-click re-tailor
 *
 * Tone options: More Technical, More Visionary, More Collaborative, More Results-Driven
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  Button,
} from '@/components/ui'
import {
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToneNudge } from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticityFeedbackProps {
  onConfirmAuthentic: () => void
  onRetailor: (nudge: ToneNudge) => void
  isRetailoring?: boolean
  className?: string
}

const TONE_OPTIONS: { value: ToneNudge; label: string; description: string; emoji: string }[] = [
  {
    value: 'more-technical',
    label: 'More Technical',
    description: 'Emphasize engineering depth and systems thinking',
    emoji: '🔧',
  },
  {
    value: 'more-visionary',
    label: 'More Visionary',
    description: 'Emphasize strategic vision and leadership presence',
    emoji: '🔭',
  },
  {
    value: 'more-collaborative',
    label: 'More Collaborative',
    description: 'Emphasize teamwork, delivery, and operational focus',
    emoji: '🤝',
  },
  {
    value: 'more-results-driven',
    label: 'More Results-Driven',
    description: 'Emphasize revenue, growth, and business impact',
    emoji: '📈',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthenticityFeedback({
  onConfirmAuthentic,
  onRetailor,
  isRetailoring = false,
  className,
}: AuthenticityFeedbackProps) {
  const [response, setResponse] = useState<'yes' | 'no' | null>(null)
  const [selectedNudge, setSelectedNudge] = useState<ToneNudge | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleYes = () => {
    setResponse('yes')
    setConfirmed(true)
    onConfirmAuthentic()
  }

  const handleNo = () => {
    setResponse('no')
  }

  const handleRetailor = () => {
    if (selectedNudge) {
      onRetailor(selectedNudge)
    }
  }

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3',
          className
        )}
      >
        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Narrative confirmed as authentic
          </p>
          <p className="text-xs text-emerald-600">
            Your transformed CV is ready for export.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <Card className={cn('border-violet-200/60 overflow-hidden', className)}>
      <div className="h-0.5 bg-gradient-to-r from-violet-300 via-purple-300 to-violet-400" />

      <CardContent className="p-5 space-y-4">
        {/* Question */}
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Does this new narrative feel authentic to you?
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Your professional brand should feel like a natural extension of who you are.
            </p>
          </div>
        </div>

        {/* Yes / No Buttons */}
        {response === null && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleYes}
              className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
            >
              <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
              Yes, this feels right
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNo}
              className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
            >
              <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
              Not quite yet
            </Button>
          </div>
        )}

        {/* Tone Nudge Options */}
        <AnimatePresence>
          {response === 'no' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden space-y-3"
            >
              <p className="text-xs font-medium text-gray-600">
                What direction would feel more like you?
              </p>

              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedNudge(opt.value)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      selectedNudge === opt.value
                        ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                        : 'border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm">{opt.emoji}</span>
                      <span className="text-xs font-bold text-gray-800">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">{opt.description}</p>
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                onClick={handleRetailor}
                disabled={!selectedNudge || isRetailoring}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white disabled:opacity-50"
              >
                {isRetailoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Re-tailoring...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Re-tailor with {selectedNudge ? TONE_OPTIONS.find(o => o.value === selectedNudge)?.label : '...'} tone
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
