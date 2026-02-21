'use client'

/**
 * SearchKeywords Component
 *
 * Editable AI-generated job search keywords with:
 * - Pill display with remove (X) button
 * - Add new keyword input
 * - API calls to PATCH /api/job-search/keywords
 * - Optimistic updates with error rollback
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Input } from '@/components/ui'
import { X, Plus, Loader2, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface SearchKeywordsProps {
  keywords: string[]
  onAdd: (keyword: string) => Promise<void>
  onRemove: (keyword: string) => Promise<void>
  isLoading?: boolean
}

// ============================================================================
// Animation Variants
// ============================================================================

const pillVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
}

// ============================================================================
// Sub-Components
// ============================================================================

interface KeywordPillProps {
  keyword: string
  onRemove: (keyword: string) => void
  isRemoving: boolean
}

function KeywordPill({ keyword, onRemove, isRemoving }: KeywordPillProps) {
  return (
    <motion.span
      variants={pillVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 bg-lavender-light text-lavender-dark rounded-full text-sm font-medium',
        isRemoving && 'opacity-50'
      )}
    >
      {keyword}
      <button
        onClick={() => onRemove(keyword)}
        disabled={isRemoving}
        className="hover:bg-lavender/30 rounded-full p-0.5 transition-colors disabled:opacity-50"
        aria-label={`Remove ${keyword}`}
      >
        {isRemoving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </button>
    </motion.span>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchKeywords({ keywords, onAdd, onRemove, isLoading }: SearchKeywordsProps) {
  const [newKeyword, setNewKeyword] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [removingKeyword, setRemovingKeyword] = useState<string | null>(null)
  const [localKeywords, setLocalKeywords] = useState<string[]>(keywords)

  // Sync with props
  useState(() => {
    setLocalKeywords(keywords)
  })

  // Handle add with optimistic update
  const handleAdd = useCallback(async () => {
    const trimmed = newKeyword.trim()
    if (!trimmed || localKeywords.includes(trimmed)) return

    // Optimistic update
    setLocalKeywords((prev) => [...prev, trimmed])
    setNewKeyword('')
    setIsAdding(true)

    try {
      await onAdd(trimmed)
    } catch (error) {
      // Rollback on error
      setLocalKeywords((prev) => prev.filter((k) => k !== trimmed))
    } finally {
      setIsAdding(false)
    }
  }, [newKeyword, localKeywords, onAdd])

  // Handle remove with optimistic update
  const handleRemove = useCallback(async (keyword: string) => {
    // Optimistic update
    setLocalKeywords((prev) => prev.filter((k) => k !== keyword))
    setRemovingKeyword(keyword)

    try {
      await onRemove(keyword)
    } catch (error) {
      // Rollback on error
      setLocalKeywords((prev) => [...prev, keyword])
    } finally {
      setRemovingKeyword(null)
    }
  }, [onRemove])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-lavender-dark" />
        Job Search Keywords
      </h4>

      <div className="flex flex-wrap gap-2 mb-3">
        <AnimatePresence mode="popLayout">
          {localKeywords.map((keyword) => (
            <KeywordPill
              key={keyword}
              keyword={keyword}
              onRemove={handleRemove}
              isRemoving={removingKeyword === keyword}
            />
          ))}
        </AnimatePresence>

        {isLoading && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm text-text-tertiary">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a keyword..."
          className="flex-1"
          disabled={isAdding}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAdd}
          disabled={!newKeyword.trim() || isAdding || localKeywords.includes(newKeyword.trim())}
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {localKeywords.length === 0 && !isLoading && (
        <p className="text-sm text-text-tertiary mt-3">
          No keywords yet. Add keywords to help find more relevant jobs.
        </p>
      )}
    </div>
  )
}

export default SearchKeywords
