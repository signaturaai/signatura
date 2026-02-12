'use client'

/**
 * CV Tailor Page - BASE44 Standard UI
 *
 * Main CV page matching BASE44 gold standard:
 * - Application selector dropdown
 * - Multiple CV versions BETA feature
 * - Professional typography and spacing
 * - Yellow alert boxes and teal headers
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { TailoringResultsDisplay } from '@/components/cv'
import { TailoringResult } from '@/lib/cv'
import {
  FileText,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  Plus,
  Building2,
  Sparkles,
  Trash2,
  Layers,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
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
  name: string | null
  raw_text: string | null
  is_primary: boolean
  is_current: boolean
  file_url: string | null
  file_name: string | null
  created_at: string
}

export default function CVPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationIdFromUrl = searchParams.get('application_id')

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TailoringResult | null>(null)

  // State for multiple versions (BETA)
  const [targetRoles, setTargetRoles] = useState<string[]>([''])
  const [isGeneratingMultiple, setIsGeneratingMultiple] = useState(false)

  const supabase = createClient()

  // Fetch applications and CVs on mount
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch applications and CVs in parallel
      // IMPORTANT: All column names MUST be lowercase to match PostgreSQL schema
      const [appsResult, cvsResult, profileResult] = await Promise.all([
        (supabase.from('job_applications') as any)
          .select('id, company_name, position_title, job_description, application_status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        (supabase.from('base_cvs') as any)
          .select('id, name, raw_text, is_primary, is_current, file_url, file_name, created_at')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .order('is_current', { ascending: false })
          .order('created_at', { ascending: false }),
        // Fallback: check profiles table for base_cv_url (set during onboarding)
        (supabase.from('profiles') as any)
          .select('base_cv_url, base_cv_uploaded, full_name')
          .eq('id', user.id)
          .single(),
      ])

      const apps = (appsResult.data || []) as Application[]
      let cvs = (cvsResult.data || []) as BaseCV[]

      // FALLBACK: If no CVs in base_cvs but profile has base_cv_url, create synthetic CV record
      if (cvs.length === 0 && profileResult.data?.base_cv_url) {
        const profileCV: BaseCV = {
          id: 'profile-cv',
          name: profileResult.data.full_name ? `${profileResult.data.full_name}'s CV` : 'My Base CV',
          raw_text: null,  // Needs processing
          is_primary: true,
          is_current: true,
          file_url: profileResult.data.base_cv_url,
          file_name: 'Uploaded CV',
          created_at: new Date().toISOString(),
        }
        cvs = [profileCV]
      }

      setApplications(apps)
      setBaseCVs(cvs)
      setIsLoadingApplications(false)
      setIsLoadingCVs(false)

      // Auto-select application if ID provided in URL
      if (applicationIdFromUrl) {
        const app = apps.find(a => a.id === applicationIdFromUrl)
        if (app) {
          setSelectedApplication(app)
        }
      }

      // Auto-select CV: priority is is_primary > is_current > first available
      if (cvs.length > 0) {
        const selectedCV = cvs.find(cv => cv.is_primary)
          || cvs.find(cv => cv.is_current)
          || cvs[0]
        setSelectedCV(selectedCV)
        if (selectedCV.raw_text) {
          setBaseCVText(selectedCV.raw_text)
        }
      }
    }

    fetchData()
  }, [applicationIdFromUrl, router, supabase])

  // Handle application selection
  const handleSelectApplication = (app: Application) => {
    setSelectedApplication(app)
    setShowApplicationDropdown(false)
  }

  // Handle adding another role input
  const handleAddRole = () => {
    if (targetRoles.length < 5) {
      setTargetRoles([...targetRoles, ''])
    }
  }

  // Handle removing a role input
  const handleRemoveRole = (index: number) => {
    if (targetRoles.length > 1) {
      setTargetRoles(targetRoles.filter((_, i) => i !== index))
    }
  }

  // Handle role input change
  const handleRoleChange = (index: number, value: string) => {
    const newRoles = [...targetRoles]
    newRoles[index] = value
    setTargetRoles(newRoles)
  }

  // Count valid roles (non-empty)
  const validRolesCount = targetRoles.filter(role => role.trim().length > 0).length

  // Handle continue CV tailoring
  const handleContinueTailoring = async () => {
    if (!selectedApplication || !selectedCV?.raw_text) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cv/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseCVText: selectedCV.raw_text,
          jobDescription: selectedApplication.job_description || '',
          industry: 'generic',
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

  // Handle generating multiple versions
  const handleGenerateMultiple = async () => {
    const validRoles = targetRoles.filter(role => role.trim().length > 0)
    if (validRoles.length === 0 || !baseCVText) return

    setIsGeneratingMultiple(true)
    setError(null)

    try {
      const response = await fetch('/api/cv/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseCVText,
          jobDescription: `Target role: ${validRoles[0]}. Looking for a position as ${validRoles[0]}.`,
          industry: 'generic',
          saveToDatabase: false,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate CV versions')
      }

      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsGeneratingMultiple(false)
    }
  }

  // Handle delete existing CVs
  const handleDeleteExistingCVs = async () => {
    if (!confirm('Are you sure you want to delete all existing tailored CVs? This cannot be undone.')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await (supabase.from('tailored_cvs') as any)
        .delete()
        .eq('user_id', user.id)

      setResult(null)
      setError(null)
    } catch (err) {
      setError('Failed to delete existing CVs')
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
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
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
          <p className="text-gray-500 mt-2">Loading your applications and CVs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <FileText className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">CV Tailor</h1>
        </div>
        <p className="text-gray-500">Your AI-powered resume tailoring assistant</p>
      </div>

      {/* New User Info Box */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <p className="text-teal-800">
          <span className="font-semibold">New to CV Tailor?</span>{' '}
          Start by creating a new application from your Dashboard using the &quot;New Application&quot; button.
          Then return here to tailor your CV.
        </p>
      </div>

      {/* Select Existing Application Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Select Existing Application</h2>
          <p className="text-gray-500 text-sm">Choose a job application to tailor or manage CVs for</p>
        </div>

        {/* Yellow Note Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            <span className="font-semibold">Note:</span> To create a CV for a new job application,
            please start from the &quot;New Application&quot; button in your Dashboard or Applications page.
          </p>
        </div>

        {/* Application Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowApplicationDropdown(!showApplicationDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            {selectedApplication ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center font-semibold text-teal-700 text-sm">
                  {selectedApplication.company_name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">{selectedApplication.position_title}</p>
                  <p className="text-xs text-gray-500">{selectedApplication.company_name}</p>
                </div>
              </div>
            ) : (
              <span className="text-gray-400">Select an application...</span>
            )}
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showApplicationDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showApplicationDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {applications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No applications yet</p>
                  <Link
                    href="/applications?new=true"
                    className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                  >
                    Create your first application
                  </Link>
                </div>
              ) : (
                applications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSelectApplication(app)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0 ${
                      selectedApplication?.id === app.id ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center font-semibold text-teal-700 text-sm">
                      {app.company_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{app.position_title}</p>
                      <p className="text-xs text-gray-500 truncate">{app.company_name}</p>
                    </div>
                    {app.job_description && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        Has JD
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Continue CV Tailoring Button */}
        <Button
          onClick={handleContinueTailoring}
          disabled={!selectedApplication || !selectedCV?.raw_text || isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-base font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Tailoring CV...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5 mr-2" />
              Continue CV Tailoring
            </>
          )}
        </Button>

        {/* Delete Existing CVs Link */}
        <button
          onClick={handleDeleteExistingCVs}
          className="w-full flex items-center justify-center gap-2 py-3 text-rose-500 hover:text-rose-600 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Existing CVs & Start Fresh
        </button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-4 text-lg font-semibold text-gray-700">Or Generate Multiple Versions</span>
        </div>
      </div>

      {/* Generate Multiple Versions Section (BETA) */}
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50/50 to-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Layers className="h-5 w-5 text-violet-600" />
            </div>
            <span className="text-lg text-gray-900">Generate Multiple CV Versions</span>
            <span className="px-2 py-0.5 bg-violet-600 text-white text-xs font-bold rounded uppercase">
              Beta
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description Box */}
          <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
            <p className="text-violet-800 text-sm">
              Generate optimized CVs for multiple job roles simultaneously. Each version will be
              ATS-optimized and tailored with role-specific keywords and achievements.
            </p>
          </div>

          {/* Target Job Roles */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Target Job Roles (up to 5)
            </label>

            {targetRoles.map((role, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => handleRoleChange(index, e.target.value)}
                  placeholder="e.g., Senior Software Engineer, Product Manager"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                {targetRoles.length > 1 && (
                  <button
                    onClick={() => handleRemoveRole(index)}
                    className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                    title="Remove role"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Another Role Button */}
          {targetRoles.length < 5 && (
            <button
              onClick={handleAddRole}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Another Role
            </button>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateMultiple}
            disabled={validRolesCount === 0 || !baseCVText || isGeneratingMultiple}
            className="w-full bg-violet-500 hover:bg-violet-600 text-white py-6 text-base font-medium"
          >
            {isGeneratingMultiple ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating CV Versions...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate {validRolesCount} CV Version{validRolesCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* No CV Warning - only show if user has zero CVs in the system */}
      {baseCVs.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-amber-800 text-sm">
            <p className="font-semibold">No Base CV Found</p>
            <p className="mt-1">
              Please upload your base CV first before tailoring. You can do this from your{' '}
              <Link href="/cv/upload" className="underline font-medium">CV Upload</Link> page.
            </p>
          </div>
        </div>
      )}

      {/* CV needs processing warning - show if CV exists but raw_text is not available */}
      {selectedCV && !selectedCV.raw_text && selectedCV.file_url && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800 text-sm">
            <p className="font-semibold">CV Processing Required</p>
            <p className="mt-1">
              Your CV <span className="font-medium">{selectedCV.name || selectedCV.file_name || 'uploaded CV'}</span> was uploaded
              but needs to be processed for text extraction. Please{' '}
              <Link href="/cv/upload" className="underline font-medium">re-upload your CV</Link> to enable tailoring.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
