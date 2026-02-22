/**
 * Job Search Cron Helper Functions
 *
 * These functions are used by the cron job and are exported separately
 * to allow for testing while keeping the route file clean.
 */

import type { JobSearchPreferencesRow } from '@/types/job-search'

// ============================================================================
// Constants
// ============================================================================

export const ZERO_MATCH_THRESHOLD_DAYS = 7
export const SEARCH_INTERVAL_WHEN_INACTIVE = 3 // days

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines if a user should be searched today based on their activity patterns.
 */
export function shouldSearchToday(prefs: JobSearchPreferencesRow): boolean {
  // Defense in depth: inactive users should not search
  if (!prefs.is_active) {
    return false
  }

  // If no consecutive zero match days, always search
  if (prefs.consecutive_zero_match_days < ZERO_MATCH_THRESHOLD_DAYS) {
    return true
  }

  // For users with 7+ consecutive zero match days, only search every 3 days
  if (!prefs.last_search_at) {
    return true // Never searched, should search
  }

  const lastSearch = new Date(prefs.last_search_at)
  const now = new Date()
  const daysSinceLastSearch = Math.floor(
    (now.getTime() - lastSearch.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceLastSearch >= SEARCH_INTERVAL_WHEN_INACTIVE
}

/**
 * Determines if an email notification is due based on frequency settings.
 */
export function isEmailDue(
  prefs: JobSearchPreferencesRow,
  now: Date = new Date()
): boolean {
  const { email_notification_frequency, last_email_sent_at } = prefs

  // Disabled frequency never sends
  if (email_notification_frequency === 'disabled') {
    return false
  }

  // Never sent before - always due for any enabled frequency
  if (!last_email_sent_at) {
    return true
  }

  const lastSent = new Date(last_email_sent_at)
  const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
  const dayOfWeek = now.getUTCDay() // 0 = Sunday, 1 = Monday
  const dayOfMonth = now.getUTCDate()

  switch (email_notification_frequency) {
    case 'daily':
      // Due if more than 24 hours since last sent
      return hoursSinceLastSent > 24

    case 'weekly':
      // Due on Monday (day 1) and more than 6 days since last sent
      return dayOfWeek === 1 && hoursSinceLastSent > 6 * 24

    case 'monthly':
      // Due on 1st of month
      return dayOfMonth === 1

    default:
      return false
  }
}
