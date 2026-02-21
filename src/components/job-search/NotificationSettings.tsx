'use client'

/**
 * NotificationSettings Component
 *
 * Toggle switch for email notifications with:
 * - On/off toggle
 * - Frequency selector dropdown (when enabled)
 * - Optimistic updates with error rollback
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { Bell, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailNotificationFrequency } from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

export interface NotificationSettingsProps {
  currentFrequency: EmailNotificationFrequency
  onUpdate: (frequency: EmailNotificationFrequency) => Promise<void>
}

// ============================================================================
// Constants
// ============================================================================

const FREQUENCY_OPTIONS: { value: EmailNotificationFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Receive daily digest of new matches' },
  { value: 'weekly', label: 'Weekly', description: 'Receive weekly summary every Monday' },
  { value: 'monthly', label: 'Monthly', description: 'Receive monthly overview on the 1st' },
]

// ============================================================================
// Animation Variants
// ============================================================================

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.95,
    transition: { duration: 0.1, ease: 'easeIn' as const },
  },
}

// ============================================================================
// Component
// ============================================================================

export function NotificationSettings({ currentFrequency, onUpdate }: NotificationSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(currentFrequency !== 'disabled')
  const [frequency, setFrequency] = useState<EmailNotificationFrequency>(
    currentFrequency === 'disabled' ? 'weekly' : currentFrequency
  )
  const [showDropdown, setShowDropdown] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Optimistic toggle with rollback
  const handleToggle = useCallback(async () => {
    const previousEnabled = isEnabled
    const previousFrequency = frequency
    const newEnabled = !isEnabled

    // Optimistic update
    setIsEnabled(newEnabled)
    setIsUpdating(true)

    try {
      await onUpdate(newEnabled ? frequency : 'disabled')
    } catch (error) {
      // Rollback on error
      setIsEnabled(previousEnabled)
      setFrequency(previousFrequency)
    } finally {
      setIsUpdating(false)
    }
  }, [isEnabled, frequency, onUpdate])

  // Frequency change with optimistic update
  const handleFrequencyChange = useCallback(async (newFrequency: EmailNotificationFrequency) => {
    if (newFrequency === 'disabled') return

    const previousFrequency = frequency

    // Optimistic update
    setFrequency(newFrequency)
    setShowDropdown(false)
    setIsUpdating(true)

    try {
      await onUpdate(newFrequency)
    } catch (error) {
      // Rollback on error
      setFrequency(previousFrequency)
    } finally {
      setIsUpdating(false)
    }
  }, [frequency, onUpdate])

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-lavender-light rounded-lg flex items-center justify-center">
          <Bell className="h-5 w-5 text-lavender-dark" />
        </div>
        <div>
          <h4 className="font-medium text-text-primary">Email Notifications</h4>
          <p className="text-sm text-text-secondary">
            {isEnabled
              ? `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} digest of new matches`
              : 'Notifications are disabled'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Frequency Selector (only when enabled) */}
        <AnimatePresence>
          {isEnabled && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="relative"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={isUpdating}
                className="flex items-center gap-2 min-w-[100px]"
              >
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                <ChevronDown className={cn(
                  'h-3 w-3 transition-transform',
                  showDropdown && 'rotate-180'
                )} />
              </Button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute top-full right-0 mt-2 w-64 bg-white border border-rose-light rounded-lg shadow-soft-md overflow-hidden z-10"
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFrequencyChange(option.value)}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-lavender-light/30 transition-colors',
                          frequency === option.value && 'bg-lavender-light'
                        )}
                      >
                        <div className="font-medium text-text-primary">{option.label}</div>
                        <div className="text-xs text-text-tertiary">{option.description}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lavender focus:ring-offset-2',
            isEnabled ? 'bg-success' : 'bg-muted',
            isUpdating && 'opacity-50'
          )}
          role="switch"
          aria-checked={isEnabled}
          aria-label="Toggle email notifications"
        >
          {isUpdating ? (
            <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-text-tertiary" />
          ) : (
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          )}
        </button>
      </div>
    </div>
  )
}

export default NotificationSettings
