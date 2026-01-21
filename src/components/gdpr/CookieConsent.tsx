'use client'

/**
 * Cookie Consent Banner
 *
 * GDPR-compliant cookie consent banner that appears for new users.
 * We only use essential cookies for authentication, no tracking cookies.
 */

import { useState, useEffect } from 'react'
import { PrivacyPolicyLink } from '@/components/legal'
import { Cookie, X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'signatura_cookie_consent'
const COOKIE_CONSENT_DATE_KEY = 'signatura_cookie_consent_date'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user has already accepted
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      setShowBanner(true)
    }
    setIsLoading(false)
  }, [])

  const handleAccept = async () => {
    // Store consent in localStorage
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    localStorage.setItem(COOKIE_CONSENT_DATE_KEY, new Date().toISOString())
    setShowBanner(false)

    // Log consent to API (if user is logged in)
    try {
      await fetch('/api/consent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_type: 'cookies',
          action: 'granted',
          version: '1.0',
        }),
      })
    } catch {
      // Silently fail - consent was recorded locally
    }
  }

  const handleDecline = () => {
    // For essential cookies only, we still need to track the decision
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined')
    localStorage.setItem(COOKIE_CONSENT_DATE_KEY, new Date().toISOString())
    setShowBanner(false)
  }

  // Don't render during SSR or while checking localStorage
  if (isLoading || !showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50 animate-slide-up">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Cookie Notice</p>
              <p className="text-gray-300">
                We use essential cookies to keep you securely logged in and provide our service. We
                do not use advertising or tracking cookies.{' '}
                <PrivacyPolicyLink className="text-blue-300 hover:text-blue-200" />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleDecline}
              className="flex-1 sm:flex-none px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 sm:flex-none px-6 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Accept
            </button>
          </div>

          <button
            onClick={handleDecline}
            className="absolute top-2 right-2 sm:hidden p-1 text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
