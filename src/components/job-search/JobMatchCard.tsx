'use client'

/**
 * JobMatchCard Component
 *
 * Displays a single job match with:
 * - Job title and match score badge
 * - Company info and description
 * - Metadata pills (location, work type, posted date)
 * - "Why this fits you" section with match reasons
 * - Tailor & Apply CTA button
 * - Feedback row with like/dislike/hide buttons
 * - Dislike reason dropdown
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button } from '@/components/ui'
import {
  Heart,
  ThumbsDown,
  EyeOff,
  ExternalLink,
  Check,
  ChevronDown,
  Zap,
  MapPin,
  Building2,
  Calendar,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JobPostingRow, FeedbackReason, UserFeedback } from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

export interface JobPosting extends JobPostingRow {
  isNew?: boolean
  matchTier?: 'excellent' | 'great' | 'good'
}

export interface JobMatchCardProps {
  job: JobPosting
  onApply: (jobId: string) => void
  onFeedback: (jobId: string, feedback: UserFeedback, reason?: FeedbackReason) => void
}

// ============================================================================
// Constants
// ============================================================================

const DISLIKE_REASONS: { value: FeedbackReason; label: string }[] = [
  { value: 'Salary too low', label: 'Salary too low' },
  { value: 'Wrong location', label: 'Wrong location' },
  { value: 'Not interested in company', label: 'Not interested in company' },
  { value: 'Skills mismatch', label: 'Skills mismatch' },
  { value: 'Other', label: 'Other' },
]

// ============================================================================
// Helper Functions
// ============================================================================

function getMatchTier(score: number): 'excellent' | 'great' | 'good' {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'great'
  return 'good'
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string {
  if (!min && !max) return 'Not specified'

  const curr = currency || 'USD'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 0,
  })

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`
  } else if (min) {
    return `${formatter.format(min)}+`
  } else if (max) {
    return `Up to ${formatter.format(max)}`
  }

  return 'Not specified'
}

function isRecentlyPosted(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays < 3
}

// ============================================================================
// Animation Variants
// ============================================================================

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    x: -100,
    scale: 0.9,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}

const reasonDropdownVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: 12,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
}

// ============================================================================
// Component
// ============================================================================

export function JobMatchCard({ job, onApply, onFeedback }: JobMatchCardProps) {
  const [showReasonDropdown, setShowReasonDropdown] = useState(false)
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const matchTier = job.matchTier || getMatchTier(job.match_score)
  const isNew = job.isNew ?? (new Date(job.discovered_at).getTime() > Date.now() - 24 * 60 * 60 * 1000)

  const tierConfig = {
    excellent: {
      bg: 'bg-success',
      text: 'text-white',
      label: 'Excellent Match',
    },
    great: {
      bg: 'bg-sky-dark',
      text: 'text-white',
      label: 'Great Match',
    },
    good: {
      bg: 'bg-lavender-dark',
      text: 'text-white',
      label: 'Good Match',
    },
  }

  const handleLike = () => {
    setShowReasonDropdown(false)
    onFeedback(job.id, 'like')
  }

  const handleDislike = () => {
    if (showReasonDropdown && selectedReason) {
      onFeedback(job.id, 'dislike', selectedReason)
      setShowReasonDropdown(false)
      setSelectedReason(null)
    } else {
      setShowReasonDropdown(true)
    }
  }

  const handleHide = () => {
    setShowReasonDropdown(false)
    onFeedback(job.id, 'hide')
  }

  const handleSelectReason = (reason: FeedbackReason) => {
    setSelectedReason(reason)
    onFeedback(job.id, 'dislike', reason)
    setShowReasonDropdown(false)
    setSelectedReason(null)
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          'transition-all duration-200',
          isHovered && 'shadow-soft-md border-rose-light'
        )}
      >
        <CardContent className="p-6">
          {/* Header: Title + Match Score */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isNew && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 bg-rose-light text-rose-dark text-xs font-semibold rounded-full"
                  >
                    NEW
                  </motion.span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-text-primary line-clamp-1">
                {job.title}
              </h3>
            </div>
            <div
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold',
                tierConfig[matchTier].bg,
                tierConfig[matchTier].text
              )}
            >
              {job.match_score}% Match
            </div>
          </div>

          {/* Company */}
          <div className="flex items-center gap-2 mb-3">
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={job.company_name}
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <div className="h-6 w-6 bg-muted rounded flex items-center justify-center">
                <Building2 className="h-4 w-4 text-text-tertiary" />
              </div>
            )}
            <span className="text-text-secondary font-medium">{job.company_name}</span>
          </div>

          {/* Description */}
          {job.description && (
            <p className="text-sm text-text-tertiary line-clamp-2 mb-4">
              {job.description}
            </p>
          )}

          {/* Metadata Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {job.location && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-sm text-text-secondary">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
            {job.work_type && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-sm text-text-secondary capitalize">
                <Briefcase className="h-3.5 w-3.5" />
                {job.work_type}
              </span>
            )}
            {job.posted_date && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm',
                  isRecentlyPosted(job.posted_date)
                    ? 'bg-success-light text-success-dark'
                    : 'bg-muted text-text-secondary'
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                {formatRelativeTime(job.posted_date)}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-lavender-light rounded-lg text-sm text-lavender-dark">
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </span>
          </div>

          {/* Why This Fits You */}
          {job.match_reasons && job.match_reasons.length > 0 && (
            <div className="bg-success-light/30 border border-success/20 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-success-dark mb-2">
                Why this fits you
              </h4>
              <div className="space-y-1.5">
                {job.match_reasons.slice(0, 4).map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="h-4 w-4 text-success-dark flex-shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <Button
            onClick={() => onApply(job.id)}
            disabled={job.status === 'applied'}
            className="w-full mb-4 bg-sky-dark hover:bg-sky-dark/90"
            size="lg"
          >
            {job.status === 'applied' ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Applied
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Tailor & Apply
              </>
            )}
          </Button>

          {/* Feedback Row */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-text-tertiary">Is this relevant?</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLike}
                className={cn(
                  'h-9 px-3',
                  job.user_feedback === 'like' && 'bg-success-light text-success-dark'
                )}
              >
                <Heart
                  className={cn(
                    'h-4 w-4 mr-1.5',
                    job.user_feedback === 'like' && 'fill-current'
                  )}
                />
                Like
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDislike}
                className={cn(
                  'h-9 px-3',
                  (job.user_feedback === 'dislike' || showReasonDropdown) &&
                    'bg-error-light text-error-dark'
                )}
              >
                <ThumbsDown className="h-4 w-4 mr-1.5" />
                Dislike
                {!showReasonDropdown && <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleHide}
                className="h-9 px-3"
              >
                <EyeOff className="h-4 w-4 mr-1.5" />
                Hide
              </Button>
            </div>
          </div>

          {/* Dislike Reason Dropdown */}
          <AnimatePresence>
            {showReasonDropdown && (
              <motion.div
                variants={reasonDropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overflow-hidden"
              >
                <div className="bg-error-light/20 border border-error/20 rounded-lg p-3">
                  <p className="text-sm text-text-secondary mb-2">
                    What's the main reason?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DISLIKE_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        onClick={() => handleSelectReason(reason.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                          selectedReason === reason.value
                            ? 'bg-error-light border-error text-error-dark'
                            : 'bg-white border-rose-light hover:border-error hover:bg-error-light/30'
                        )}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* View Original Link */}
          {job.source_url && (
            <div className="mt-4 text-center">
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-sky-dark hover:underline"
              >
                View original posting
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default JobMatchCard
