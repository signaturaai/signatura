'use client'

/**
 * Onboarding Wizard Component
 *
 * Main orchestrator for the onboarding flow.
 * Routes to candidate or recruiter specific onboarding based on user type.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CandidateOnboarding from './CandidateOnboarding'
import { RecruiterOnboarding } from './RecruiterOnboarding'
import { Loader2, Sparkles } from 'lucide-react'

export function OnboardingWizard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userType, setUserType] = useState<'candidate' | 'recruiter' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error

        // Type assertion for untyped table
        const profile = profileData as unknown as {
          onboarding_completed: boolean
          user_type: 'candidate' | 'recruiter'
        }

        // Check if already completed onboarding
        if (profile.onboarding_completed) {
          router.push(profile.user_type === 'recruiter' ? '/jobs' : '/dashboard')
          return
        }

        setUserId(user.id)
        setUserType(profile.user_type)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load your profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error && !userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-900">Signatura</span>
          </div>
          <div className="text-sm text-gray-500">
            {userType === 'candidate' ? 'Candidate' : 'Recruiter'} Setup
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-12">
        {error && (
          <div className="max-w-2xl mx-auto px-6 mb-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {userType === 'candidate' && userId ? (
          <CandidateOnboarding userId={userId} />
        ) : userType === 'recruiter' && userId ? (
          <RecruiterOnboarding userId={userId} />
        ) : null}
      </div>
    </div>
  )
}
