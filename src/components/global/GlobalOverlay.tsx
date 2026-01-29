'use client'

/**
 * Global Overlay Component
 *
 * Persistent UI layer with floating action buttons (FABs) that appear on every page.
 * - Bottom Left: Utility widgets (Accessibility, Bug Reporter)
 * - Bottom Right: Siggy AI Companion toggle
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Accessibility, Bug, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FloatingCompanionDrawer } from './FloatingCompanionDrawer'

interface GlobalOverlayProps {
  userId?: string
  userName?: string
  streak?: number
}

export function GlobalOverlay({ userId, userName, streak = 0 }: GlobalOverlayProps) {
  const pathname = usePathname()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showAccessibilityToast, setShowAccessibilityToast] = useState(false)
  const [showBugToast, setShowBugToast] = useState(false)

  // Context awareness: Check if we're on a page where chat is already visible
  const isOnDashboard = pathname === '/dashboard'
  const isOnCompanionPage = pathname === '/companion'
  const showFloatingChat = !isOnDashboard && !isOnCompanionPage

  // Close toasts after 3 seconds
  useEffect(() => {
    if (showAccessibilityToast) {
      const timer = setTimeout(() => setShowAccessibilityToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showAccessibilityToast])

  useEffect(() => {
    if (showBugToast) {
      const timer = setTimeout(() => setShowBugToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showBugToast])

  const handleAccessibilityClick = () => {
    setShowAccessibilityToast(true)
  }

  const handleBugClick = () => {
    setShowBugToast(true)
  }

  const handleSiggyClick = () => {
    if (showFloatingChat) {
      setIsChatOpen(!isChatOpen)
    }
    // If on dashboard/companion page, the chat is already visible
  }

  return (
    <>
      {/* ===== GROUP A: Utility FABs (Bottom Left) ===== */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
        {/* Accessibility Widget */}
        <div className="group relative">
          <button
            onClick={handleAccessibilityClick}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              'bg-sky-dark text-white shadow-lg',
              'transition-all duration-300 ease-out',
              'hover:scale-110 hover:shadow-xl',
              'focus:outline-none focus:ring-2 focus:ring-sky-dark focus:ring-offset-2'
            )}
            aria-label="Accessibility Tools"
          >
            <Accessibility className="w-5 h-5" />
          </button>
          {/* Tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            Accessibility Tools
          </div>
        </div>

        {/* Bug Reporter */}
        <div className="group relative">
          <button
            onClick={handleBugClick}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              'bg-peach-dark text-white shadow-lg',
              'transition-all duration-300 ease-out',
              'hover:scale-110 hover:shadow-xl',
              'focus:outline-none focus:ring-2 focus:ring-peach-dark focus:ring-offset-2'
            )}
            aria-label="Report an Issue"
          >
            <Bug className="w-5 h-5" />
          </button>
          {/* Tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            Report an Issue
          </div>
        </div>
      </div>

      {/* ===== GROUP B: Siggy AI Companion (Bottom Right) ===== */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="group relative">
          <button
            onClick={handleSiggyClick}
            className={cn(
              'relative w-14 h-14 rounded-full overflow-hidden',
              'shadow-lg transition-all duration-300 ease-out',
              'hover:scale-110 hover:shadow-xl',
              'focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2',
              isChatOpen && 'ring-2 ring-rose ring-offset-2'
            )}
            aria-label={isChatOpen ? 'Close Siggy Chat' : 'Open Siggy Chat'}
          >
            {/* Avatar Image */}
            <div className="w-full h-full bg-gradient-to-br from-rose-light via-peach-light to-lavender-light flex items-center justify-center">
              {/* Placeholder: Professional woman silhouette using initials */}
              <span className="text-xl font-semibold text-rose-dark">S</span>
            </div>

            {/* Online Status Indicator */}
            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
          </button>

          {/* Tooltip (only show when chat is closed) */}
          {!isChatOpen && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              Chat with Siggy
            </div>
          )}

          {/* Streak badge */}
          {streak > 0 && !isChatOpen && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
              {streak}
            </div>
          )}
        </div>
      </div>

      {/* ===== Toast Notifications ===== */}
      {/* Accessibility Toast */}
      {showAccessibilityToast && (
        <div className="fixed bottom-24 left-6 z-50 animate-fade-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border border-sky-light">
            <Accessibility className="w-5 h-5 text-sky-dark" />
            <div>
              <p className="text-sm font-medium text-text-primary">Accessibility Tools</p>
              <p className="text-xs text-text-secondary">Coming soon! We&apos;re building inclusive features.</p>
            </div>
            <button
              onClick={() => setShowAccessibilityToast(false)}
              className="ml-2 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bug Reporter Toast */}
      {showBugToast && (
        <div className="fixed bottom-24 left-6 z-50 animate-fade-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border border-peach-light">
            <Bug className="w-5 h-5 text-peach-dark" />
            <div>
              <p className="text-sm font-medium text-text-primary">Report an Issue</p>
              <p className="text-xs text-text-secondary">Send feedback to help@signatura.ai</p>
            </div>
            <button
              onClick={() => setShowBugToast(false)}
              className="ml-2 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== Floating Companion Chat Drawer ===== */}
      {showFloatingChat && (
        <FloatingCompanionDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          userId={userId || 'guest'}
          userName={userName || 'Friend'}
          streak={streak}
          currentPath={pathname}
        />
      )}
    </>
  )
}
