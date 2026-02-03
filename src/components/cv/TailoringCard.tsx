'use client'

/**
 * TailoringCard — Side-by-side comparison of Original vs Suggested bullet.
 *
 * Features:
 * - Toggle to accept/reject suggestion
 * - Inline edit mode with textarea
 * - Keyword highlighting (ATS matches from job description)
 * - "Closes [X] Gap" badges
 * - Score delta display
 * - Framer-motion transitions for accept/reject state changes
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui'
import {
  Check,
  X,
  Pencil,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react'
import type { KeywordMatch, GapClosure } from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TailoringCardProps {
  index: number
  originalBullet: string
  suggestedBullet: string
  scoreDelta: number
  originalScore: number
  suggestedScore: number
  matchedKeywords: KeywordMatch[]
  gapsClosing: GapClosure[]
  isAccepted: boolean
  onToggleAccept: (index: number) => void
  onEditSuggestion: (index: number, newText: string) => void
  onResync: (index: number) => void
  isResyncing?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders text with keyword highlights.
 * Splits text at keyword boundaries and wraps matches in styled spans.
 */
function HighlightedText({
  text,
  keywords,
}: {
  text: string
  keywords: KeywordMatch[]
}) {
  if (keywords.length === 0) return <>{text}</>

  const segments: { text: string; isHighlight: boolean }[] = []
  let lastEnd = 0

  for (const kw of keywords) {
    if (kw.startIndex > lastEnd) {
      segments.push({ text: text.substring(lastEnd, kw.startIndex), isHighlight: false })
    }
    segments.push({ text: text.substring(kw.startIndex, kw.endIndex), isHighlight: true })
    lastEnd = kw.endIndex
  }
  if (lastEnd < text.length) {
    segments.push({ text: text.substring(lastEnd), isHighlight: false })
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.isHighlight ? (
          <mark
            key={i}
            className="bg-indigo-100 text-indigo-800 px-0.5 rounded font-medium"
            title="ATS keyword match"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  )
}

function ScoreDeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
        <Minus className="w-3 h-3" />
        No change
      </span>
    )
  }

  const isPositive = delta > 0
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-xs font-bold',
        isPositive ? 'text-emerald-600' : 'text-red-500'
      )}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{delta} pts
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TailoringCard({
  index,
  originalBullet,
  suggestedBullet,
  scoreDelta,
  originalScore,
  suggestedScore,
  matchedKeywords,
  gapsClosing,
  isAccepted,
  onToggleAccept,
  onEditSuggestion,
  onResync,
  isResyncing = false,
}: TailoringCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(suggestedBullet)
  const [hasLocalEdits, setHasLocalEdits] = useState(false)

  const handleStartEdit = useCallback(() => {
    setEditText(suggestedBullet)
    setIsEditing(true)
  }, [suggestedBullet])

  const handleSaveEdit = useCallback(() => {
    onEditSuggestion(index, editText)
    setIsEditing(false)
    setHasLocalEdits(editText !== suggestedBullet)
  }, [index, editText, suggestedBullet, onEditSuggestion])

  const handleCancelEdit = useCallback(() => {
    setEditText(suggestedBullet)
    setIsEditing(false)
  }, [suggestedBullet])

  const handleResync = useCallback(() => {
    setHasLocalEdits(false)
    onResync(index)
  }, [index, onResync])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        'rounded-xl border transition-colors duration-200 overflow-hidden',
        isAccepted
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-gray-200 bg-white/80'
      )}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/80">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
          <ScoreDeltaBadge delta={scoreDelta} />

          {/* Gap closure badges */}
          {gapsClosing.length > 0 && (
            <div className="flex items-center gap-1.5">
              {gapsClosing.map((gap) => (
                <span
                  key={gap.principleId}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200"
                >
                  Closes {gap.gapName}
                </span>
              ))}
            </div>
          )}

          {matchedKeywords.length > 0 && (
            <span className="text-[10px] font-medium text-indigo-500">
              {matchedKeywords.length} keyword{matchedKeywords.length !== 1 ? 's' : ''} matched
            </span>
          )}
        </div>

        {/* Accept toggle */}
        <button
          onClick={() => onToggleAccept(index)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
            isAccepted
              ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          )}
        >
          <AnimatePresence mode="wait">
            {isAccepted ? (
              <motion.span
                key="accepted"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Accepted
              </motion.span>
            ) : (
              <motion.span
                key="pending"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                Accept
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Original */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Original
            </span>
            <span className="text-[10px] font-bold text-gray-400 tabular-nums">
              {originalScore}/100
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {originalBullet}
          </p>
        </div>

        {/* Suggested / Edit */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Suggested
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-500 tabular-nums">
                {suggestedScore}/100
              </span>
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                  title="Edit suggestion"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[80px] text-sm leading-relaxed border-indigo-200 focus:border-indigo-300 focus:ring-indigo-200/50"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-sm text-gray-800 leading-relaxed">
                  <HighlightedText text={suggestedBullet} keywords={matchedKeywords} />
                </p>
                {hasLocalEdits && (
                  <button
                    onClick={handleResync}
                    disabled={isResyncing}
                    className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    {isResyncing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Re-sync score
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
