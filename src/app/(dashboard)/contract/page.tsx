'use client'

/**
 * Contract Reviewer - Application-Centric with Intelligence Continuity
 *
 * Requires application selection first, then pulls:
 * - Company and position context from application
 * - Negotiated salary from compensation session
 * - Key terms to watch for based on industry
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import {
  FileCheck,
  ArrowLeft,
  Loader2,
  Briefcase,
  ChevronDown,
  Plus,
  Building2,
  DollarSign,
  Shield,
  Brain,
} from 'lucide-react'
import Link from 'next/link'
import { ContractUploader } from '@/components/contract/ContractUploader'
import { ContractDashboard } from '@/components/contract/ContractDashboard'
import { getMockContractAnalysis } from '@/lib/contract'
import type { ContractAnalysisResult, ContractFileType } from '@/types/contract'
import { createClient } from '@/lib/supabase/client'

// Toggle this to use real API vs mock data
const USE_MOCK = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_AI === 'true'

interface Application {
  id: string
  company_name: string
  position_title: string
  application_status: string
  industry: string | null
  salary_range: string | null
  created_at: string
}

interface NegotiationSession {
  id: string
  final_salary: number | null
  final_equity: string | null
  key_terms_agreed: string[] | null
  created_at: string
}

interface GlobalInsight {
  id: string
  insight_type: string
  insight_text: string
  created_at: string
}

type Mode = 'loading' | 'select-application' | 'upload' | 'dashboard'

export default function ContractReviewerPage() {
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
  const [negotiationSession, setNegotiationSession] = useState<NegotiationSession | null>(null)
  const [globalInsights, setGlobalInsights] = useState<GlobalInsight[]>([])

  // Contract state
  const [mode, setMode] = useState<Mode>('loading')
  const [analysis, setAnalysis] = useState<ContractAnalysisResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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

      // Fetch applications - prioritize those with offers
      // IMPORTANT: All column names MUST be lowercase to match PostgreSQL schema
      const { data: apps } = await (supabase.from('job_applications') as any)
        .select('id, company_name, position_title, application_status, industry, salary_range, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch global insights related to contracts
      const { data: insights } = await (supabase.from('global_user_insights') as any)
        .select('id, insight_type, insight_text, created_at')
        .eq('user_id', user.id)
        .in('insight_type', ['contract_red_flag', 'industry_norm', 'legal_preference'])
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
          await fetchNegotiationData(user.id, applicationIdFromUrl)
          setMode('upload')
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

  // Fetch negotiation data
  const fetchNegotiationData = async (userId: string, applicationId: string) => {
    const { data: sessions } = await (supabase.from('negotiation_sessions') as any)
      .select('id, final_salary, final_equity, key_terms_agreed, created_at')
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessions && sessions.length > 0) {
      setNegotiationSession(sessions[0])
    } else {
      setNegotiationSession(null)
    }
  }

  // Handle application selection
  const handleSelectApplication = async (app: Application) => {
    setSelectedApplication(app)
    setShowApplicationDropdown(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await fetchNegotiationData(user.id, app.id)
    }

    setMode('upload')
  }

  const handleUploadComplete = async (
    fileUrl: string,
    uploadedFileName: string,
    fileType: ContractFileType
  ) => {
    if (!selectedApplication) {
      setError('Please select an application first')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setFileName(uploadedFileName)

    try {
      if (USE_MOCK) {
        // Use mock data for UI testing
        await new Promise((resolve) => setTimeout(resolve, 2500))
        const mockAnalysis = getMockContractAnalysis()
        setAnalysis(mockAnalysis)
        setMode('dashboard')
      } else {
        // Call real API with application context
        const response = await fetch('/api/contract/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl,
            fileName: uploadedFileName,
            applicationId: selectedApplication.id,
            companyName: selectedApplication.company_name,
            positionTitle: selectedApplication.position_title,
            industry: selectedApplication.industry,
            // Include intelligence context
            intelligenceContext: {
              negotiatedTerms: negotiationSession
                ? {
                    salary: negotiationSession.final_salary,
                    equity: negotiationSession.final_equity,
                    agreedTerms: negotiationSession.key_terms_agreed || [],
                  }
                : null,
              targetSalary: selectedApplication.salary_range,
              globalInsights: globalInsights.map(i => i.insight_text),
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to analyze contract')
        }

        const result = await response.json()
        setAnalysis(result.analysis)
        setMode('dashboard')
      }
    } catch (err) {
      console.error('Error analyzing contract:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleBack = () => {
    setMode('upload')
    setAnalysis(null)
    setFileName(null)
    setError(null)
  }

  const handleAnalyzeAnother = () => {
    setMode('upload')
    setAnalysis(null)
    setFileName(null)
    setError(null)
  }

  const getBackUrl = () => {
    if (selectedApplication) {
      return `/applications/${selectedApplication.id}`
    }
    return returnTo
  }

  // Sort applications - offer/accepted status first
  const sortedApplications = [...applications].sort((a, b) => {
    const priorityStatus = ['accepted', 'offer_received', 'negotiating']
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
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-500 mt-2">Loading your applications...</p>
        </div>
      </div>
    )
  }

  // Select Application mode - No applications exist
  if (mode === 'select-application' && applications.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
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
            <h1 className="text-3xl font-bold text-gray-900">Contract Reviewer</h1>
          </div>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="pt-8 pb-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No Applications Yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                To review a contract, you first need to create a job application.
                This helps us understand the context and verify the terms match your offer.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/applications?new=true&returnTo=/contract">
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
      <div className="container mx-auto py-8 px-4 max-w-5xl">
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
            <h1 className="text-3xl font-bold text-gray-900">Contract Reviewer</h1>
            <p className="text-gray-600 mt-2">
              Select an application to review its employment contract.
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
                Choose which job's contract you want to review. Applications with offers are shown first.
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
                      const hasOffer = ['accepted', 'offer_received', 'negotiating'].includes(app.application_status)
                      return (
                        <button
                          key={app.id}
                          onClick={() => handleSelectApplication(app)}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left border-b last:border-b-0 ${
                            hasOffer ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-lavender-light/50 flex items-center justify-center font-semibold text-blue-600 text-sm">
                            {app.company_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate text-sm">{app.position_title}</p>
                            <p className="text-xs text-gray-500 truncate">{app.company_name}</p>
                          </div>
                          {hasOffer && (
                            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              {app.application_status === 'accepted' ? 'Accepted' : 'Has Offer'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="text-center text-sm text-gray-500">or</div>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/applications?new=true&returnTo=/contract">
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
    <div className="container mx-auto py-8 px-4 max-w-5xl">
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
        <h1 className="text-3xl font-bold text-gray-900">Contract Reviewer</h1>
        <p className="text-gray-600 mt-2">
          {mode === 'upload'
            ? `Upload your employment contract from ${selectedApplication?.company_name} for AI-powered legal analysis`
            : 'Your contract analysis is ready'}
        </p>
      </motion.div>

      {/* Selected Application Card */}
      {selectedApplication && mode === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  Reviewing Contract for
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
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-100 to-lavender-light flex items-center justify-center font-semibold text-blue-600 text-lg">
                  {selectedApplication.company_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{selectedApplication.position_title}</p>
                  <p className="text-sm text-gray-500">{selectedApplication.company_name}</p>
                </div>
              </div>

              {/* Intelligence Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg ${negotiationSession ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className={`w-4 h-4 ${negotiationSession ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={negotiationSession ? 'text-green-700 font-medium' : 'text-gray-500'}>
                      {negotiationSession ? 'Terms Negotiated' : 'No Negotiation Data'}
                    </span>
                  </div>
                  {negotiationSession?.final_salary && (
                    <p className="text-xs text-green-600 mt-1">
                      Agreed: ${negotiationSession.final_salary.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${selectedApplication.industry ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className={`w-4 h-4 ${selectedApplication.industry ? 'text-green-600' : 'text-amber-500'}`} />
                    <span className={selectedApplication.industry ? 'text-green-700 font-medium' : 'text-amber-600'}>
                      {selectedApplication.industry || 'Set Industry'}
                    </span>
                  </div>
                </div>
              </div>

              {/* What to Watch For */}
              {(negotiationSession || globalInsights.length > 0) && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">We'll Check For</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {negotiationSession?.final_salary && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        Salary matches ${negotiationSession.final_salary.toLocaleString()}
                      </span>
                    )}
                    {negotiationSession?.key_terms_agreed?.slice(0, 2).map((term, i) => (
                      <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {term}
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
        {mode === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <ContractUploader
              onUploadComplete={handleUploadComplete}
              isAnalyzing={isAnalyzing}
            />

            {/* Processing Indicator */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">
                        Analyzing your contract for {selectedApplication?.company_name}...
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Our AI is reviewing clauses and comparing to your negotiated terms.
                      </p>
                    </div>
                  </div>

                  {/* What We're Checking */}
                  <div className="mt-6 space-y-3">
                    <AnalysisStep step={1} label="Extracting text from document" isComplete={true} isCurrent={false} />
                    <AnalysisStep step={2} label="Identifying contract clauses" isComplete={false} isCurrent={true} />
                    <AnalysisStep step={3} label="Comparing to negotiated terms" isComplete={false} isCurrent={false} />
                    <AnalysisStep step={4} label="Generating recommendations" isComplete={false} isCurrent={false} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Info Section */}
            {!isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 grid md:grid-cols-3 gap-4"
              >
                <InfoCard
                  title="Identify Red Flags"
                  description="AI scans for problematic clauses like restrictive non-competes or broad IP assignments."
                  icon="flag"
                />
                <InfoCard
                  title="Verify Your Terms"
                  description="We'll check if the contract matches your negotiated salary and benefits."
                  icon="check"
                />
                <InfoCard
                  title="Negotiation Tips"
                  description="Get actionable advice on what to negotiate before signing."
                  icon="lightbulb"
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {mode === 'dashboard' && analysis && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ContractDashboard
              analysis={analysis}
              fileName={fileName || undefined}
              onBack={handleBack}
              onAnalyzeAnother={handleAnalyzeAnother}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Analysis Step Component
function AnalysisStep({
  step,
  label,
  isComplete,
  isCurrent,
}: {
  step: number
  label: string
  isComplete: boolean
  isCurrent: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          isComplete
            ? 'bg-blue-600 text-white'
            : isCurrent
              ? 'bg-blue-100 text-blue-600 animate-pulse'
              : 'bg-gray-200 text-gray-500'
        }`}
      >
        {isComplete ? '✓' : step}
      </div>
      <span
        className={`text-sm ${
          isComplete
            ? 'text-blue-700 font-medium'
            : isCurrent
              ? 'text-blue-600'
              : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

// Info Card Component
function InfoCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: 'flag' | 'check' | 'lightbulb'
}) {
  const iconMap = {
    flag: (
      <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    check: (
      <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    lightbulb: (
      <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        {iconMap[icon]}
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}
