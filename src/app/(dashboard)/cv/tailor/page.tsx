'use client'

/**
 * CV Tailor - Application-Centric "Best of Both Worlds"
 *
 * Interactive page for tailoring a CV to a specific job application.
 * - Requires selecting an application first (or creating one)
 * - Auto-fetches user's base CV from Supabase
 * - Pre-fills job description from the selected application
 * - Guarantees the final CV is at least as good as the original
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { TailoringResultsDisplay } from '@/components/cv'
import { TailoringResult } from '@/lib/cv'
import {
  Sparkles,
  FileText,
  Briefcase,
  Loader2,
  ArrowLeft,
  Info,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Plus,
  Building2,
} from 'lucide-react'
import Link from 'next/link'
import { usePMAnalysis } from '@/hooks/usePMAnalysis'
import { getPrinciplesForContext } from '@/lib/ai/siggy-pm-intelligence'
import { createClient } from '@/lib/supabase/client'

interface Application {
  id: string
  company_name: string
  position_title: string
  job_description: string | null
  application_status: string
  created_at: string
}

interface BaseCV {
  id: string
  name: string
  raw_text: string | null
  is_primary: boolean
  created_at: string
}

const INDUSTRIES = [
  { value: 'generic', label: 'General / Other' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
]

export default function CVTailorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationIdFromUrl = searchParams.get('application_id')
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  // State for application selection
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [showApplicationDropdown, setShowApplicationDropdown] = useState(false)

  // State for CV
  const [baseCVs, setBaseCVs] = useState<BaseCV[]>([])
  const [selectedCV, setSelectedCV] = useState<BaseCV | null>(null)
  const [baseCVText, setBaseCVText] = useState('')
  const [isLoadingCVs, setIsLoadingCVs] = useState(true)

  // State for tailoring
  const [jobDescription, setJobDescription] = useState('')
  const [industry, setIndustry] = useState('generic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TailoringResult | null>(null)
  const [showPMPanel, setShowPMPanel] = useState(false)

  // PM Intelligence
  const { analysis: pmAnalysis, isAnalyzing: isPMAnalyzing } = usePMAnalysis(baseCVText)
  const cvPrinciples = getPrinciplesForContext('cvTailor')

  const supabase = createClient()

  // Fetch applications and CVs on mount
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch applications in parallel with CVs
      // IMPORTANT: All column names MUST be lowercase to match PostgreSQL schema
      const [appsResult, cvsResult] = await Promise.all([
        (supabase.from('job_applications') as any)
          .select('id, company_name, position_title, job_description, application_status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        (supabase.from('base_cvs') as any)
          .select('id, name, raw_text, is_primary, created_at')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false }),
      ])

      const apps = (appsResult.data || []) as Application[]
      const cvs = (cvsResult.data || []) as BaseCV[]

      setApplications(apps)
      setBaseCVs(cvs)
      setIsLoadingApplications(false)
      setIsLoadingCVs(false)

      // Auto-select application if ID provided in URL
      if (applicationIdFromUrl) {
        const app = apps.find(a => a.id === applicationIdFromUrl)
        if (app) {
          setSelectedApplication(app)
          if (app.job_description) {
            setJobDescription(app.job_description)
          }
        }
      }

      // Auto-select primary CV or first CV
      if (cvs.length > 0) {
        const primaryCV = cvs.find(cv => cv.is_primary) || cvs[0]
        setSelectedCV(primaryCV)
        if (primaryCV.raw_text) {
          setBaseCVText(primaryCV.raw_text)
        }
      }
    }

    fetchData()
  }, [applicationIdFromUrl, router, supabase])

  // Handle application selection
  const handleSelectApplication = (app: Application) => {
    setSelectedApplication(app)
    // Always update jobDescription - clear if null, set if exists
    // This prevents stale JD from previous app when switching
    setJobDescription(app.job_description || '')
    setShowApplicationDropdown(false)
  }

  // Handle CV selection
  const handleSelectCV = (cv: BaseCV) => {
    setSelectedCV(cv)
    // Always update baseCVText - clear if null, set if exists
    // This prevents stale CV text when switching CVs
    setBaseCVText(cv.raw_text || '')
  }

  // Check if user has usable CVs (with raw_text)
  const hasUsableCVs = baseCVs.some(cv => cv.raw_text && cv.raw_text.length > 0)

  const canSubmit =
    selectedApplication &&
    baseCVText.length >= 100 &&
    jobDescription.length >= 50 &&
    !isLoading

  const handleSubmit = async () => {
    if (!canSubmit || !selectedApplication) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/cv/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseCVText,
          jobDescription,
          industry,
          saveToDatabase: true,
          applicationId: selectedApplication.id,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to tailor CV')
      }

      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  // Determine back URL
  const getBackUrl = () => {
    if (selectedApplication) {
      return `/applications/${selectedApplication.id}`
    }
    return returnTo
  }

  // Show results if we have them
  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Tailor Another CV
          </Button>
          {selectedApplication && (
            <Button variant="ghost" asChild>
              <Link href={`/applications/${selectedApplication.id}`}>
                Back to {selectedApplication.company_name}
              </Link>
            </Button>
          )}
        </div>

        <TailoringResultsDisplay result={result} />
      </div>
    )
  }

  // Loading state
  if (isLoadingApplications || isLoadingCVs) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-lavender-dark" />
          <p className="text-gray-500 mt-2">Loading your applications and CVs...</p>
        </div>
      </div>
    )
  }

  // No applications state - prompt to create one
  if (applications.length === 0) {
    return (
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
          <h1 className="text-2xl font-bold">Tailor Your CV</h1>
        </div>

        <Card className="border-lavender-light bg-gradient-to-br from-lavender-light/20 to-white">
          <CardContent className="pt-8 pb-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-lavender-dark mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Applications Yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              To tailor your CV, you first need to create a job application.
              This helps us match your CV perfectly to the job requirements.
            </p>
            <Button asChild className="bg-lavender hover:bg-lavender-dark">
              <Link href="/applications?new=true&returnTo=/cv/tailor">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Application
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            href={getBackUrl()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {selectedApplication ? `Back to ${selectedApplication.company_name}` : 'Back to Dashboard'}
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Tailor Your CV</h1>
        <p className="text-muted-foreground">
          Get an optimized CV that&apos;s guaranteed to be as good or better than your original.
        </p>
      </div>

      {/* Application Selection Card */}
      <Card className={selectedApplication ? 'border-lavender-dark bg-lavender-light/10' : 'border-amber-300 bg-amber-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-5 w-5 text-lavender-dark" />
            {selectedApplication ? 'Selected Application' : 'Step 1: Select an Application'}
          </CardTitle>
          {!selectedApplication && (
            <CardDescription>
              Choose which job you&apos;re tailoring your CV for, or create a new application.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {selectedApplication ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-lavender-light to-sky-light flex items-center justify-center font-semibold text-lavender-dark">
                  {selectedApplication.company_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{selectedApplication.position_title}</p>
                  <p className="text-sm text-gray-500">{selectedApplication.company_name}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApplicationDropdown(!showApplicationDropdown)}
              >
                Change
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
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
              <div className="text-center text-sm text-gray-500">or</div>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/applications?new=true&returnTo=/cv/tailor">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Application
                </Link>
              </Button>
            </div>
          )}

          {/* Application Dropdown */}
          {showApplicationDropdown && (
            <div className="mt-3 border rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
              {applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleSelectApplication(app)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-lavender-light/20 transition-colors text-left border-b last:border-b-0 ${
                    selectedApplication?.id === app.id ? 'bg-lavender-light/30' : ''
                  }`}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-lavender-light/50 to-sky-light/50 flex items-center justify-center font-semibold text-lavender-dark text-sm">
                    {app.company_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate text-sm">{app.position_title}</p>
                    <p className="text-xs text-gray-500 truncate">{app.company_name}</p>
                  </div>
                  {app.job_description && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      Has JD
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Only show rest of form if application is selected */}
      {selectedApplication && (
        <>
          {/* Info card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How &quot;Best of Both Worlds&quot; Works</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>1. We parse your CV into sections (Summary, Experience, Skills, etc.)</li>
                    <li>2. We generate a tailored version optimized for the job description</li>
                    <li>3. We compare each section and keep whichever version scores higher</li>
                    <li>4. Your final CV is guaranteed to never be worse than your original</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Base CV */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Your CV
                  </span>
                  {baseCVs.length > 1 && (
                    <select
                      value={selectedCV?.id || ''}
                      onChange={(e) => {
                        const cv = baseCVs.find(c => c.id === e.target.value)
                        if (cv) handleSelectCV(cv)
                      }}
                      className="text-sm border rounded-lg px-2 py-1"
                    >
                      {baseCVs.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          {cv.name} {cv.is_primary ? '(Primary)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedCV?.raw_text
                    ? 'Using your saved CV. You can edit below if needed.'
                    : baseCVs.length > 0
                      ? 'Your saved CV has no text content. Please paste your CV below.'
                      : 'No saved CV found. Paste your CV text below to get started.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* No CV Alert */}
                {!hasUsableCVs && baseCVText.length === 0 && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>No saved CV found. Paste your CV below, and we&apos;ll remember it for next time.</span>
                  </div>
                )}
                <textarea
                  value={baseCVText}
                  onChange={(e) => setBaseCVText(e.target.value)}
                  placeholder="Paste your CV text here...

Example:
PROFESSIONAL SUMMARY
Experienced software engineer with 5 years of experience...

EXPERIENCE
Senior Software Engineer | TechCorp | 2021-Present
- Led development of microservices architecture...

SKILLS
JavaScript, TypeScript, React, Node.js...

EDUCATION
BS Computer Science | University of Technology | 2018"
                  className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {baseCVText.length} characters
                  </span>
                  {baseCVText.length < 100 && baseCVText.length > 0 && (
                    <span className="text-xs text-amber-600">
                      Minimum 100 characters required
                    </span>
                  )}
                </div>

                {/* PM Score Badge */}
                {pmAnalysis && (
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        pmAnalysis.score >= 80
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : pmAnalysis.score >= 60
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : pmAnalysis.score >= 40
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      PM Score: {pmAnalysis.score}/100
                    </div>
                    {isPMAnalyzing && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  Job Description
                </CardTitle>
                <CardDescription>
                  {selectedApplication.job_description
                    ? `Pre-filled from ${selectedApplication.company_name}. Edit if needed.`
                    : 'Paste the job description for this role.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here...

Example:
Senior Frontend Engineer

About the Role:
We're looking for an experienced frontend engineer to join our team...

Requirements:
- 5+ years of experience with React
- Strong TypeScript skills
- Experience with state management

Responsibilities:
- Lead frontend architecture decisions
- Mentor junior developers
- Collaborate with design team"
                  className="w-full h-48 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {jobDescription.length} characters
                  </span>
                  {jobDescription.length < 50 && jobDescription.length > 0 && (
                    <span className="text-xs text-amber-600">
                      Minimum 50 characters required
                    </span>
                  )}
                </div>

                {/* Industry selector */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind.value} value={ind.value}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Industry affects how skills and experiences are weighted
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Siggy's PM Suggestions Panel */}
          {pmAnalysis && baseCVText.length >= 100 && (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50/80 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-purple-600" />
                    Siggy&apos;s PM Suggestions
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPMPanel(!showPMPanel)}
                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                  >
                    {showPMPanel ? 'Hide Details' : 'Show Details'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {pmAnalysis.feedback.strengths}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick suggestions */}
                {pmAnalysis.feedback.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-purple-900">Quick Wins:</p>
                    <ul className="space-y-1.5">
                      {pmAnalysis.feedback.suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pmAnalysis.score >= 80 && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Strong PM framing detected. Your CV speaks the language hiring managers look for.
                  </div>
                )}

                {/* Expandable: Missing principles + PM Principles Reference */}
                {showPMPanel && (
                  <div className="space-y-4 pt-2 border-t border-purple-100">
                    {/* Missing Principles */}
                    {pmAnalysis.feedback.missingPrinciples.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-purple-900">Missing PM Principles:</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {pmAnalysis.feedback.missingPrinciples.map(
                            (p: { id: string; name: string; howToApply: string }) => (
                              <div
                                key={p.id}
                                className="p-3 bg-white rounded-lg border border-purple-100 shadow-sm"
                              >
                                <p className="text-sm font-semibold text-purple-800">{p.name}</p>
                                <p className="text-xs text-gray-600 mt-1">{p.howToApply}</p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* PM Principles Reference */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-900">PM Principles for CV Writing:</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {cvPrinciples.map((principle) => (
                          <div
                            key={principle.id}
                            className="p-3 bg-purple-50/50 rounded-lg border border-purple-100"
                          >
                            <p className="text-sm font-semibold text-purple-800">{principle.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{principle.description}</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-red-600">
                                Weak: &quot;{principle.exampleFraming.weak}&quot;
                              </p>
                              <p className="text-xs text-green-700">
                                Strong: &quot;{principle.exampleFraming.strong.slice(0, 120)}...&quot;
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-8 py-6 text-lg"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Tailoring for {selectedApplication.company_name}...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Tailor My CV for {selectedApplication.company_name}
                </>
              )}
            </Button>
          </div>

          {/* Loading message */}
          {isLoading && (
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>This may take 30-60 seconds as we analyze and optimize each section.</p>
              <p>Your original CV is safe - we&apos;ll only improve what can be improved.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
