'use client'

/**
 * Onboarding Wizard Component
 *
 * Main orchestrator for the onboarding flow.
 * Routes to candidate or recruiter specific onboarding based on user type.
 *
 * CRITICAL: New users start at Role Selection (step 0).
 * Only after selecting a role do they proceed to role-specific onboarding.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { StrategicOnboarding } from './StrategicOnboarding'
import { RecruiterOnboarding } from './RecruiterOnboarding'
import { Loader2, Sparkles, UserCircle, Building2, ArrowRight, CheckCircle } from 'lucide-react'

type UserRole = 'candidate' | 'recruiter'

/**
 * Welcome/Role Selection Step
 * This is the first screen new users see.
 */
function RoleSelectionStep({
  onSelectRole,
  loading,
}: {
  onSelectRole: (role: UserRole) => void
  loading: boolean
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const handleContinue = () => {
    if (selectedRole) {
      onSelectRole(selectedRole)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto px-6"
    >
      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
        {/* Welcome Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Welcome to Signatura
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Your AI-powered career companion. Let us personalize your experience.
          </p>
        </div>

        {/* Role Selection */}
        <div className="space-y-4 mb-8">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-wide">
            I am a...
          </p>

          {/* Job Seeker Option */}
          <button
            onClick={() => setSelectedRole('candidate')}
            disabled={loading}
            className={`w-full p-6 rounded-2xl border-2 transition-all duration-200 text-left group ${
              selectedRole === 'candidate'
                ? 'border-orange-500 bg-orange-50 shadow-md'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl transition-colors ${
                selectedRole === 'candidate'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600'
              }`}>
                <UserCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-900">Job Seeker</h3>
                  {selectedRole === 'candidate' && (
                    <CheckCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <p className="text-gray-600 mt-1">
                  Looking for my next opportunity. Help me craft the perfect CV and ace interviews.
                </p>
              </div>
            </div>
          </button>

          {/* Recruiter Option */}
          <button
            onClick={() => setSelectedRole('recruiter')}
            disabled={loading}
            className={`w-full p-6 rounded-2xl border-2 transition-all duration-200 text-left group ${
              selectedRole === 'recruiter'
                ? 'border-orange-500 bg-orange-50 shadow-md'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl transition-colors ${
                selectedRole === 'recruiter'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600'
              }`}>
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-900">Recruiter / Hiring Manager</h3>
                  {selectedRole === 'recruiter' && (
                    <CheckCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <p className="text-gray-600 mt-1">
                  Hiring for my team. Help me find and evaluate top talent efficiently.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            selectedRole && !loading
              ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:shadow-lg hover:scale-[1.02]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Setting up your experience...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Privacy Note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your data is encrypted and never shared without your consent.
        </p>
      </div>
    </motion.div>
  )
}

export function OnboardingWizard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [savingRole, setSavingRole] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userType, setUserType] = useState<UserRole | null>(null)
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

        setUserId(user.id)
        setUserEmail(user.email || null)
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null)

        // Try to get existing profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type, onboarding_completed')
          .eq('id', user.id)
          .single()

        // Type assertion for untyped table
        const profile = profileData as {
          onboarding_completed: boolean | null
          user_type: UserRole | null
        } | null

        // Check if already completed onboarding
        if (profile?.onboarding_completed === true) {
          router.push(profile.user_type === 'recruiter' ? '/jobs' : '/dashboard')
          return
        }

        // If user has selected a role, use it
        // Otherwise, userType remains null and we show role selection
        if (profile?.user_type) {
          setUserType(profile.user_type)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        // Don't set error for missing profile - that's expected for new users
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, router])

  // Handle role selection
  const handleRoleSelect = async (role: UserRole) => {
    if (!userId || !userEmail) {
      setError('Session expired. Please log in again.')
      return
    }

    setSavingRole(true)
    setError(null)

    try {
      // Update or insert the profile with the selected role
      // Include ALL required fields for upsert to work when row doesn't exist
      const { error: upsertError } = await (supabase
        .from('profiles') as any)
        .upsert({
          id: userId,
          email: userEmail,
          full_name: userName,
          user_type: role,
          onboarding_completed: false,
          is_admin: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        })

      if (upsertError) throw upsertError

      // Also update user_profiles if it exists
      await (supabase
        .from('user_profiles') as any)
        .upsert({
          id: userId,
          email: userEmail,
          full_name: userName,
          user_type: role,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        })

      // Set the user type to proceed to role-specific onboarding
      setUserType(role)
    } catch (err) {
      console.error('Error saving role:', err)
      setError('Failed to save your selection. Please try again.')
    } finally {
      setSavingRole(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lavender-light/20 via-white to-peach-light/20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // No user ID - redirect to login
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lavender-light/20 via-white to-peach-light/20">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-gray-600 mb-4">Please log in to continue</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Determine header text based on current state
  const getHeaderText = () => {
    if (!userType) return 'Getting Started'
    return userType === 'candidate' ? 'Candidate Setup' : 'Recruiter Setup'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-light/20 via-white to-peach-light/20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose" />
            <span className="font-semibold text-gray-900">Signatura</span>
          </div>
          <div className="text-sm text-gray-500">
            {getHeaderText()}
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

        <AnimatePresence mode="wait">
          {/* Step 1: Role Selection (when userType is null) */}
          {!userType && (
            <RoleSelectionStep
              key="role-selection"
              onSelectRole={handleRoleSelect}
              loading={savingRole}
            />
          )}

          {/* Step 2+: Role-specific onboarding */}
          {userType === 'candidate' && (
            <motion.div
              key="candidate-onboarding"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StrategicOnboarding userId={userId} />
            </motion.div>
          )}

          {userType === 'recruiter' && (
            <motion.div
              key="recruiter-onboarding"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <RecruiterOnboarding userId={userId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
