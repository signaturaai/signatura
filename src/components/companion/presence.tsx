'use client'

/**
 * Companion Presence Indicator
 *
 * A subtle indicator showing the companion is "present" and the user's streak.
 * Positioned at the bottom right of the screen.
 */

import { Heart } from 'lucide-react'

interface CompanionPresenceProps {
  streak: number
}

export function CompanionPresence({ streak }: CompanionPresenceProps) {
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-companion/10 border border-companion/20 shadow-lg">
      <Heart className="h-4 w-4 text-companion animate-pulse-gentle" />
      <span className="text-sm text-companion font-medium">
        {streak > 0 ? `${streak} day streak` : "I'm here for you"}
      </span>
    </div>
  )
}
