'use client'

/**
 * Compensation Negotiator - Application-Centric with Intelligence Continuity
 *
 * Requires application selection first, then pulls:
 * - Target salary from the original application
 * - Tailored CV achievements for leverage
 * - Interview performance insights
 * - Company/industry context
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import {
  DollarSign,
  ArrowLeft,
  Loader2,
  Briefcase,
  ChevronDown,
  Plus,
  Building2,
  CheckCircle,
  FileText,
  Mic,
  Target,
  TrendingUp,
  Brain,
} from 'lucide-react'
import Link from 'next/link'
import { CompensationWizard, type WizardOutput } from '@/components/compensation/CompensationWizard'
import { NegotiationDashboard } from '@/components/compensation/NegotiationDashboard'
import { getMockCompensationStrategy } from '@/lib/compensation/mockData'
import type { CompensationStrategy } from '@/types/compensation'
import { createClient } from '@/lib/supabase/client'

// Toggle this to use real API vs mock data
const USE_MOCK = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_AI === 'true'

interface Application {
  id: string
  company_name: string
  position_title: string
  job_description: string | null
  application_status: string
  industry: string | null
  salary_range: string | null
  salary_min: number | null
  salary_max: number | null
  created_at: string
}

interface TailoringSession {
  id: string
  final_cv_text: string
  final_overall_score: number
  key_achievements: string[] | null
  created_at: string
}

interface InterviewSession {
  id: string
  interview_score: number | null
  strengths: string[] | null
  areas_for_improvement: string[] | null
  created_at: string
}

interface GlobalInsight {
  id: string
  insight_type: string
  insight_text: string
  created_at: string
}

type Mode = 'loading' | 'select-application' | 'wizard' | 'dashboard'

export default function CompensationNegotiatorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationIdFromUrl = searchParams.get('application_id')
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  // Application state
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [showApplicationDropdown, setShowApplicationDropdown] = useState(false)

  // Intelligence continuity state
  const [tailoringSession, setTailoringSession] = useState<TailoringSession | null>(null)
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null)
  const [globalInsights, setGlobalInsights] = useState<GlobalInsight[]>([])

  // Negotiation state
  const [mode, setMode] = useState<Mode>('loading')
  const [strategy, setStrategy] = useState<CompensationStrategy | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch applications on mount
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch applications with offer/interviewing status first, then all
      const { data: apps } = await (supabase.from('job_applications') as any)
        .select('id, company_name, position_title, job_description, application_status, industry, salary_range, salary_min, salary_max, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch global insights
      const { data: insights } = await (supabase.from('global_user_insights') as any)
        .select('id, insight_type, insight_text, created_at')
        .eq('user_id', user.id)
        .in('insight_type', ['negotiation_strength', 'salary_benchmark', 'market_insight'])
        .order('created_at', { ascending: false })
        .limit(5)

      setApplications(apps || [])
      setGlobalInsights(insights || [])
      setIsLoadingApplications(false)

      // Auto-select application if ID provided in URL
      if (applicationIdFromUrl && apps) {
        const app = apps.find((a: Application) => a.id === applicationIdFromUrl)
        if (app) {
          setSelectedApplication(app)
          await fetchIntelligenceData(user.id, applicationIdFromUrl)
          setMode('wizard')
        } else {
          setMode('select-application')
        }
      } else if (apps && apps.length === 0) {
        setMode('select-application')
      } else {
        setMode('select-application')
      }
    }

    fetchData()
  }, [applicationIdFromUrl, router, supabase])

  // Fetch intelligence data (CV tailoring + interview sessions)
  const fetchIntelligenceData = async (userId: string, applicationId: string) => {
    // Fetch tailored CV session
    const { data: cvSessions } = await (supabase.from('cv_tailoring_sessions') as any)
      .select('id, final_cv_text, final_overall_score, key_achievements, created_at')
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (cvSessions && cvSessions.length > 0) {
      setTailoringSession(cvSessions[0])
    } else {
      setTailoringSession(null)
    }

    // Fetch interview session
    const { data: interviewSessions } = await (supabase.from('interview_sessions') as any)
      .select('id, interview_score, strengths, areas_for_improvement, created_at')
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (interviewSessions && interviewSessions.length > 0) {
      setInterviewSession(interviewSessions[0])
    } else {
      setInterviewSession(null)
    }
  }

  // Handle application selection
  const handleSelectApplication = async (app: Application) => {
    setSelectedApplication(app)
    setShowApplicationDropdown(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await fetchIntelligenceData(user.id, app.id)
    }

    setMode('wizard')
  }

  const handleWizardComplete = async (data: WizardOutput) => {
    if (!selectedApplication) {
      setError('Please select an application first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Pre-populate with application data
      const enrichedData = {
        ...data,
        offerDetails: {
          ...data.offerDetails,
          companyName: selectedApplication.company_name,
          positionTitle: selectedApplication.position_title,
          industry: selectedApplication.industry || data.offerDetails.industry,
        },
        // Add intelligence context
        intelligenceContext: {
          tailoredCV: tailoringSession
            ? {
                score: tailoringSession.final_overall_score,
                achievements: tailoringSession.key_achievements || [],
              }
            : null,
          interviewPerformance: interviewSession
            ? {
                score: interviewSession.interview_score,
                strengths: interviewSession.strengths || [],
              }
            : null,
          globalInsights: globalInsights.map(i => i.insight_text),
          originalSalaryRange: {
            min: selectedApplication.salary_min,
            max: selectedApplication.salary_max,
            range: selectedApplication.salary_range,
          },
        },
        applicationId: selectedApplication.id,
      }

      if (USE_MOCK) {
        // Use mock data for UI testing
        await new Promise(resolve => setTimeout(resolve, 1500))
        const mockStrategy = getMockCompensationStrategy({
          offerDetails: enrichedData.offerDetails,
          userPriorities: data.userPriorities,
        })
        setStrategy(mockStrategy)
        setMode('dashboard')
      } else {
        // Call real API
        const response = await fetch('/api/compensation/generate-strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enrichedData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate strategy')
        }

        const result = await response.json()
        setStrategy(result.strategy)
        setMode('dashboard')
      }
    } catch (err) {
      console.error('Error generating strategy:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!strategy || !selectedApplication) return

    setIsLoading(true)
    setError(null)

    try {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        const mockStrategy = getMockCompensationStrategy({
          offerDetails: strategy.offerDetails,
          userPriorities: strategy.userPriorities,
          regenerationCount: (strategy.regenerationCount || 0) + 1,
        })
        setStrategy(mockStrategy)
      } else {
        const response = await fetch('/api/compensation/generate-strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerDetails: strategy.offerDetails,
            userPriorities: strategy.userPriorities,
            applicationId: selectedApplication.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to regenerate strategy')
        }

        const result = await response.json()
        setStrategy(result.strategy)
      }
    } catch (err) {
      console.error('Error regenerating strategy:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setMode('wizard')
    setStrategy(null)
    setError(null)
  }

  const getBackUrl = () => {
    if (selectedApplication) {
      return `/applications/${selectedApplication.id}`
    }
    return returnTo
  }

  // Filter applications to show offer/interviewing status first
  const sortedApplications = [...applications].sort((a, b) => {
    const priorityStatus = ['offer_received', 'negotiating', 'interview_scheduled', 'interviewed']
    const aIndex = priorityStatus.indexOf(a.application_status)
    const bIndex = priorityStatus.indexOf(b.application_status)
    if (aIndex !== -1 && bIndex === -1) return -1
    if (aIndex === -1 && bIndex !== -1) return 1
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    return 0
  })

  // Loading state
  if (mode === 'loading' || isLoadingApplications) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-success" />
          <p className="text-gray-500 mt-2">Loading your applications...</p>
        </div>
      </div>
    )
  }

  // Select Application mode - No applications exist
  if (mode === 'select-application' && applications.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={returnTo}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Compensation Negotiator</h1>
          </div>

          <Card className="border-success/30 bg-gradient-to-br from-success-light/20 to-white">
            <CardContent className="pt-8 pb-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-success mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No Applications Yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                To negotiate compensation, you first need to create a job application.
                This helps us understand your target salary and company context.
              </p>
              <Button asChild className="bg-success hover:bg-success-dark">
                <Link href="/applications?new=true&returnTo=/compensation">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Application
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Select Application mode
  if (mode === 'select-application') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={returnTo}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Compensation Negotiator</h1>
            <p className="text-gray-600 mt-2">
              Select an application to get personalized negotiation strategies.
            </p>
          </div>

          {/* Application Selection Card */}
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-5 w-5 text-amber-600" />
                Step 1: Select an Application
              </CardTitle>
              <CardDescription>
                Choose which job offer you want to negotiate. Applications with offers are shown first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowApplicationDropdown(!showApplicationDropdown)}
                  >
                    <span className="text-gray-500">Select an application...</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                {showApplicationDropdown && (
                  <div className="border rounded-lg bg-white shadow-lg max-h-80 overflow-y-auto">
                    {sortedApplications.map((app) => {
                      const hasOffer = ['offer_received', 'negotiating'].includes(app.application_status)
                      return (
                        <button
                          key={app.id}
                          onClick={() => handleSelectApplication(app)}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-success-light/20 transition-colors text-left border-b last:border-b-0 ${
                            hasOffer ? 'bg-success-light/10' : ''
                          }`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-success-light/50 to-lavender-light/50 flex items-center justify-center font-semibold text-success text-sm">
                            {app.company_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate text-sm">{app.position_title}</p>
                            <p className="text-xs text-gray-500 truncate">{app.company_name}</p>
                            {app.salary_range && (
                              <p className="text-xs text-success-dark">{app.salary_range}</p>
                            )}
                          </div>
                          {hasOffer && (
                            <span className="text-xs text-success-dark bg-success-light px-2 py-0.5 rounded-full">
                              Has Offer
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="text-center text-sm text-gray-500">or</div>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/applications?new=true&returnTo=/compensation">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Application
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <Link
            href={getBackUrl()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {selectedApplication ? `Back to ${selectedApplication.company_name}` : 'Back'}
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Compensation Negotiator</h1>
        <p className="text-gray-600 mt-2">
          {mode === 'wizard'
            ? `Enter your offer details for ${selectedApplication?.company_name} to get personalized negotiation strategies`
            : 'Your personalized negotiation strategy and playbook'}
        </p>
      </motion.div>

      {/* Selected Application Card */}
      {selectedApplication && mode === 'wizard' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-success/30 bg-gradient-to-br from-success-light/10 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-success" />
                  Negotiating for
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('select-application')}
                >
                  Change
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-success-light to-lavender-light flex items-center justify-center font-semibold text-success text-lg">
                  {selectedApplication.company_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{selectedApplication.position_title}</p>
                  <p className="text-sm text-gray-500">{selectedApplication.company_name}</p>
                </div>
              </div>

              {/* Intelligence Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg ${tailoringSession ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className={`w-4 h-4 ${tailoringSession ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={tailoringSession ? 'text-green-700 font-medium' : 'text-gray-500'}>
                      {tailoringSession ? 'CV Ready' : 'No CV'}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${interviewSession ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 text-sm">
                    <Mic className={`w-4 h-4 ${interviewSession ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={interviewSession ? 'text-green-700 font-medium' : 'text-gray-500'}>
                      {interviewSession ? 'Interview Done' : 'No Interview'}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${selectedApplication.salary_range ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className={`w-4 h-4 ${selectedApplication.salary_range ? 'text-green-600' : 'text-amber-500'}`} />
                    <span className={selectedApplication.salary_range ? 'text-green-700 font-medium' : 'text-amber-600'}>
                      {selectedApplication.salary_range ? 'Target Set' : 'Set Target'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Intelligence Insights */}
              {(tailoringSession || interviewSession || globalInsights.length > 0) && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Your Negotiation Leverage</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tailoringSession && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        CV Score: {tailoringSession.final_overall_score?.toFixed(0)}
                      </span>
                    )}
                    {interviewSession?.strengths?.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                    {globalInsights.slice(0, 2).map((insight) => (
                      <span key={insight.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {insight.insight_text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
        >
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {mode === 'wizard' && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <CompensationWizard
              onComplete={handleWizardComplete}
              isLoading={isLoading}
              initialData={selectedApplication ? {
                companyName: selectedApplication.company_name,
                positionTitle: selectedApplication.position_title,
                industry: selectedApplication.industry || undefined,
                salaryMin: selectedApplication.salary_min || undefined,
                salaryMax: selectedApplication.salary_max || undefined,
              } : undefined}
            />
          </motion.div>
        )}

        {mode === 'dashboard' && strategy && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <NegotiationDashboard
              strategy={strategy}
              onRegenerate={handleRegenerate}
              onBack={handleBack}
              isRegenerating={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
