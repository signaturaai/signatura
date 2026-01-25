'use client'

/**
 * Unauthorized Access Page
 *
 * Displayed when a user tries to access a route they don't have permission for.
 */

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldX, ArrowLeft, User, Briefcase, Shield } from 'lucide-react'
import { Suspense } from 'react'

function UnauthorizedContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const messages: Record<string, { title: string; message: string; suggestion: string; icon: React.ReactNode }> = {
    candidate_only: {
      title: 'Candidate Feature',
      message: 'This feature is only available for job seekers (candidates).',
      suggestion: 'If you need access to job search tools, please create a candidate account.',
      icon: <User className="w-12 h-12 text-blue-500" />,
    },
    recruiter_only: {
      title: 'Recruiter Feature',
      message: 'This feature is only available for recruiters.',
      suggestion: 'If you are hiring talent, please create a recruiter account.',
      icon: <Briefcase className="w-12 h-12 text-purple-500" />,
    },
    admin_only: {
      title: 'Admin Access Required',
      message: 'This section requires administrator privileges.',
      suggestion: 'Please contact your administrator if you need access.',
      icon: <Shield className="w-12 h-12 text-red-500" />,
    },
    not_authenticated: {
      title: 'Authentication Required',
      message: 'You need to be logged in to access this page.',
      suggestion: 'Please log in or create an account to continue.',
      icon: <ShieldX className="w-12 h-12 text-gray-500" />,
    },
  }

  const content = messages[reason || ''] || {
    title: 'Access Denied',
    message: 'You do not have permission to access this page.',
    suggestion: 'Please contact support if you believe this is an error.',
    icon: <ShieldX className="w-12 h-12 text-red-500" />,
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-6">{content.icon}</div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h1>

          <p className="text-gray-700 mb-4">{content.message}</p>

          <p className="text-gray-500 text-sm mb-8">{content.suggestion}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Home
            </Link>

            {reason === 'not_authenticated' && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Log In
              </Link>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:hello@signatura.ai" className="text-rose-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  )
}
