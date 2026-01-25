'use client'

/**
 * Recruiter Onboarding Component
 *
 * 6-step onboarding flow for recruiters:
 * 1. Welcome
 * 2. Company Information
 * 3. Recruiter Role
 * 4. Hiring Details
 * 5. Integration Preferences
 * 6. Complete
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

type Step = 1 | 2 | 3 | 4 | 5 | 6

const companySizes = [
  { value: 'startup', label: 'Startup', description: '1-50 employees' },
  { value: 'small', label: 'Small', description: '51-200 employees' },
  { value: 'medium', label: 'Medium', description: '201-1000 employees' },
  { value: 'large', label: 'Large', description: '1001-5000 employees' },
  { value: 'enterprise', label: 'Enterprise', description: '5000+ employees' },
]

const recruiterRoles = [
  { value: 'internal', label: 'Internal Recruiter', description: 'Hiring for my own company' },
  { value: 'agency', label: 'Agency Recruiter', description: 'Hiring for client companies' },
  { value: 'freelance', label: 'Freelance Recruiter', description: 'Independent recruiting consultant' },
  { value: 'hr_generalist', label: 'HR Generalist', description: 'Recruiting is part of my broader role' },
]

const industries = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Marketing',
  'Sales', 'Engineering', 'Design', 'Legal', 'Consulting',
  'Media', 'Retail', 'Manufacturing', 'Real Estate', 'Non-profit', 'Other'
]

const commonRoles = [
  'Software Engineer', 'Product Manager', 'Designer', 'Data Scientist',
  'Sales Representative', 'Marketing Manager', 'Customer Success',
  'Operations', 'Finance', 'HR', 'Executive', 'Other'
]

export function RecruiterOnboarding({ userId }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  // Step 2: Company data
  const [companyName, setCompanyName] = useState('')
  const [companyIndustry, setCompanyIndustry] = useState('')
  const [companyLocation, setCompanyLocation] = useState('')
  const [companySize, setCompanySize] = useState('')

  // Step 3: Role data
  const [fullName, setFullName] = useState('')
  const [recruiterRole, setRecruiterRole] = useState('')
  const [teamSize, setTeamSize] = useState<number | ''>('')

  // Step 4: Hiring data
  const [hiringFocus, setHiringFocus] = useState<string[]>([])
  const [monthlyHires, setMonthlyHires] = useState(5)
  const [hiringIndustry, setHiringIndustry] = useState('')

  const totalSteps = 6
  const progress = (currentStep / totalSteps) * 100

  const handleNext = async () => {
    if (currentStep === 6) {
      await completeOnboarding()
    } else {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const toggleHiringFocus = (role: string) => {
    setHiringFocus(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  const completeOnboarding = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company_name: companyName,
          company_industry: companyIndustry,
          location: companyLocation,
          company_size: companySize,
          recruiter_role: recruiterRole,
          team_size: teamSize || null,
          hiring_focus: hiringFocus,
          monthly_hires: monthlyHires,
          industry: hiringIndustry,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 6
        })
        .eq('id', userId)

      router.push('/jobs')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('Failed to complete onboarding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen flex items-center">
      <div className="w-full">
        {/* Progress Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 mb-2">Step {currentStep} of {totalSteps}</p>
          <h1 className="text-2xl font-bold mb-4">
            {currentStep === 1 && 'Welcome to Signatura!'}
            {currentStep === 2 && 'Company Information'}
            {currentStep === 3 && 'Your Role'}
            {currentStep === 4 && 'Hiring Details'}
            {currentStep === 5 && 'Integrations'}
            {currentStep === 6 && "You're All Set!"}
          </h1>

          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* STEP 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold mb-4">Welcome to Signatura!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Your AI-powered recruiting assistant to help you find the best talent faster
              </p>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-8 text-left">
                <p className="text-sm text-purple-900">
                  Let&apos;s set up your recruiter profile. This will only take 2 minutes.
                </p>
              </div>

              <button
                onClick={handleNext}
                className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 inline-flex items-center gap-2"
              >
                Let&apos;s Go!
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* STEP 2: Company Information */}
          {currentStep === 2 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-6 text-center">Company Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Industry
                  </label>
                  <select
                    value={companyIndustry}
                    onChange={(e) => setCompanyIndustry(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select industry</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={companyLocation}
                    onChange={(e) => setCompanyLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    Company Size
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {companySizes.map(size => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setCompanySize(size.value)}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          companySize === size.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{size.label}</div>
                        <div className="text-xs text-gray-500">{size.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!companyName}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Recruiter Role */}
          {currentStep === 3 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-6 text-center">Your Role</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    What best describes your role? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {recruiterRoles.map(role => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setRecruiterRole(role.value)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                          recruiterRole === role.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{role.label}</div>
                        <div className="text-sm text-gray-500">{role.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Team Size (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="How many people on your recruiting team?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!fullName || !recruiterRole}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Hiring Details */}
          {currentStep === 4 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-6 text-center">Hiring Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Roles you typically hire for
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {commonRoles.map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleHiringFocus(role)}
                        className={`px-3 py-2 border rounded-full text-sm transition-colors ${
                          hiringFocus.includes(role)
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        {hiringFocus.includes(role) ? '✓ ' : '+ '}{role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Average monthly hires
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={monthlyHires}
                      onChange={(e) => setMonthlyHires(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg font-semibold w-12 text-center">
                      {monthlyHires}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    hires per month (approximate)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Primary hiring industry
                  </label>
                  <select
                    value={hiringIndustry}
                    onChange={(e) => setHiringIndustry(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select industry focus</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={hiringFocus.length === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Integrations */}
          {currentStep === 5 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-6 text-center">Integrations</h2>
              <p className="text-center text-gray-600 mb-6">
                Connect your existing tools (coming soon)
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-700">
                  <strong>Coming Soon!</strong> These integrations are in development.
                  We&apos;ll notify you when they&apos;re available.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'LinkedIn Recruiter', description: 'Import candidates from LinkedIn', icon: '💼' },
                  { label: 'ATS Integration', description: 'Connect your applicant tracking system', icon: '📊' },
                  { label: 'Calendar Sync', description: 'Sync interview schedules', icon: '📅' },
                  { label: 'Email Integration', description: 'Manage candidate communications', icon: '📧' },
                ].map(integration => (
                  <div
                    key={integration.label}
                    className="p-4 border border-gray-200 rounded-lg opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {integration.label}
                          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
                            Coming Soon
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">{integration.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center gap-2"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Complete */}
          {currentStep === 6 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold mb-4">You&apos;re All Set!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Ready to find your next great hire
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                <p className="text-sm text-green-800">
                  Your recruiter profile is ready. Start posting jobs and finding top talent!
                </p>
              </div>

              <button
                onClick={handleNext}
                disabled={loading}
                className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? 'Setting up...' : 'Go to Dashboard'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
