'use client'

/**
 * New Application Wizard
 *
 * Multi-step wizard for creating job applications with automatic CV tailoring.
 * Steps: 1) Application Details, 2) CV Selection, 3) Tailoring, 4) Results
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TailoringResult } from '@/lib/cv'
import { X, Loader2, CheckCircle, FileText, Briefcase, Sparkles, ArrowRight } from 'lucide-react'

interface NewApplicationWizardProps {
  isOpen: boolean
  onClose: () => void
  /** Callback when usage limit is reached (403 response) */
  onLimitReached?: () => void
}

const INDUSTRIES = [
  { value: 'generic', label: 'Other / Generic' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'finance', label: 'Finance' },
]

export default function NewApplicationWizard({ isOpen, onClose, onLimitReached }: NewApplicationWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Application details
  const [companyName, setCompanyName] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [industry, setIndustry] = useState('generic')
  const [excitementLevel, setExcitementLevel] = useState(5)
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')

  // Step 2: CV selection
  const [cvSource, setCvSource] = useState<'upload' | 'existing' | 'paste'>('paste')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvText, setCvText] = useState('')

  // Step 3 & 4: Tailoring results
  const [applicationId, setApplicationId] = useState('')
  const [tailoringResult, setTailoringResult] = useState<TailoringResult | null>(null)
  const [tailoringProgress, setTailoringProgress] = useState<string[]>([])

  const resetWizard = () => {
    setCurrentStep(1)
    setLoading(false)
    setError(null)
    setCompanyName('')
    setPositionTitle('')
    setJobDescription('')
    setJobUrl('')
    setIndustry('generic')
    setExcitementLevel(5)
    setPriority('medium')
    setCvSource('paste')
    setCvFile(null)
    setCvText('')
    setApplicationId('')
    setTailoringResult(null)
    setTailoringProgress([])
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const handleStep1Next = async () => {
    if (!companyName.trim()) {
      setError('Company name is required')
      return
    }
    if (!positionTitle.trim()) {
      setError('Position title is required')
      return
    }
    if (!jobDescription.trim() || jobDescription.length < 50) {
      setError('Job description is required (minimum 50 characters)')
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Create the application record
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          position_title: positionTitle,
          job_description: jobDescription,
          job_url: jobUrl || null,
          status: 'preparing',
          excitement_level: excitementLevel,
          priority,
          industry,
          source: 'manual',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle subscription-specific errors
        if (response.status === 402) {
          // No subscription - redirect to pricing
          handleClose()
          router.push('/pricing')
          return
        }
        if (response.status === 403) {
          // Usage limit reached - show upgrade prompt
          handleClose()
          onLimitReached?.()
          return
        }
        throw new Error(data.error || 'Failed to create application')
      }

      setApplicationId(data.application.id)
      setCurrentStep(2)
    } catch (err) {
      console.error('Error creating application:', err)
      setError(err instanceof Error ? err.message : 'Failed to create application')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Next = async () => {
    let baseCVText = ''

    if (cvSource === 'paste') {
      if (!cvText.trim() || cvText.length < 100) {
        setError('Please paste your CV text (minimum 100 characters)')
        return
      }
      baseCVText = cvText
    } else if (cvSource === 'upload') {
      if (!cvFile) {
        setError('Please upload a CV file')
        return
      }
      try {
        baseCVText = await cvFile.text()
      } catch {
        setError('Failed to read the uploaded file')
        return
      }
    } else {
      setError('Please select a CV source')
      return
    }

    setError(null)
    setLoading(true)
    setCurrentStep(3)
    setTailoringProgress(['Parsing CV sections...'])

    try {
      // Simulate progress updates
      setTimeout(() => setTailoringProgress((p) => [...p, 'Scoring original content...']), 1000)
      setTimeout(() => setTailoringProgress((p) => [...p, 'Generating tailored version...']), 2500)
      setTimeout(
        () => setTailoringProgress((p) => [...p, 'Comparing and selecting best sections...']),
        4000
      )

      // Call CV tailoring API
      const response = await fetch('/api/cv/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCVText,
          jobDescription,
          applicationId,
          industry,
          saveToDatabase: true,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to tailor CV')
      }

      setTailoringResult(data.result)
      setCurrentStep(4)
    } catch (err) {
      console.error('Error tailoring CV:', err)
      setError(err instanceof Error ? err.message : 'Failed to tailor CV')
      setCurrentStep(2) // Go back to CV selection
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    router.push(`/applications/${applicationId}`)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            New Job Application
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'CV' },
              { num: 3, label: 'Tailoring' },
              { num: 4, label: 'Done' },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      currentStep >= step.num
                        ? 'bg-rose-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.num ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className="text-xs mt-1 text-gray-600">{step.label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={`w-12 h-1 mx-1 rounded transition-colors ${
                      currentStep > step.num ? 'bg-rose-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="p-6">
          {/* STEP 1: Application Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Tell me about this role</h3>
                <p className="text-sm text-gray-600">
                  I&apos;ll use this information to tailor your CV perfectly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g., County General Hospital"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Position Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g., Senior Emergency Room Nurse"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-2 border rounded-lg h-40 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Paste the full job description here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {jobDescription.length} characters (minimum 50)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Job URL (Optional)</label>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind.value} value={ind.value}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Excitement: {excitementLevel}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={excitementLevel}
                    onChange={(e) => setExcitementLevel(parseInt(e.target.value))}
                    className="w-full mt-2 accent-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStep1Next}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Next: Add Your CV
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CV Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Provide your CV
                </h3>
                <p className="text-sm text-gray-600">
                  I&apos;ll analyze and optimize it for {companyName} - {positionTitle}
                </p>
              </div>

              <div className="space-y-3">
                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    cvSource === 'paste'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cvSource"
                    checked={cvSource === 'paste'}
                    onChange={() => setCvSource('paste')}
                    className="mr-3 accent-rose-500"
                  />
                  <div>
                    <div className="font-medium">Paste CV Text</div>
                    <div className="text-sm text-gray-600">Copy and paste your CV content</div>
                  </div>
                </label>

                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    cvSource === 'upload'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cvSource"
                    checked={cvSource === 'upload'}
                    onChange={() => setCvSource('upload')}
                    className="mr-3 accent-rose-500"
                  />
                  <div>
                    <div className="font-medium">Upload CV File</div>
                    <div className="text-sm text-gray-600">TXT file supported</div>
                  </div>
                </label>
              </div>

              {cvSource === 'paste' && (
                <div className="mt-4">
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    className="w-full p-3 border rounded-lg h-64 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Paste your CV text here...

Example:
PROFESSIONAL SUMMARY
Experienced professional with...

EXPERIENCE
Company Name | Role | Dates
- Achievement 1
- Achievement 2

SKILLS
Skill 1, Skill 2, Skill 3

EDUCATION
Degree | Institution | Year"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {cvText.length} characters (minimum 100)
                  </p>
                </div>
              )}

              {cvSource === 'upload' && (
                <div className="mt-4">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                  />
                  {cvFile && (
                    <p className="text-sm text-green-600 mt-2">
                      Selected: {cvFile.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setError(null)
                    setCurrentStep(1)
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Tailor My CV
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Tailoring in Progress */}
          {currentStep === 3 && (
            <div className="text-center py-12">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-rose-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-rose-500 border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-rose-500" />
              </div>

              <h3 className="text-xl font-semibold mb-2">
                Tailoring your CV for {companyName}
              </h3>
              <p className="text-gray-600 mb-6">
                {positionTitle}
              </p>

              <div className="max-w-xs mx-auto text-left space-y-2">
                {tailoringProgress.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-gray-600 animate-fade-in"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {step}
                  </div>
                ))}
                {tailoringProgress.length < 4 && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-8">
                This may take 30-60 seconds
              </p>
            </div>
          )}

          {/* STEP 4: Results */}
          {currentStep === 4 && tailoringResult && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Your CV is Ready!</h3>
                <p className="text-gray-600">
                  Optimized for {companyName} - {positionTitle}
                </p>
              </div>

              {/* Score Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500 mb-1">Original Score</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {tailoringResult.baseOverallScore.toFixed(1)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-green-600 mb-1">Final Score</div>
                  <div className="text-2xl font-bold text-green-700">
                    {tailoringResult.finalOverallScore.toFixed(1)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-blue-600 mb-1">Improvement</div>
                  <div className="text-2xl font-bold text-blue-700">
                    +{tailoringResult.overallImprovement.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Smart Optimization:</strong> We improved{' '}
                  {tailoringResult.sectionsImproved} sections and kept{' '}
                  {tailoringResult.sectionsKeptOriginal} sections from your original
                  because they were already excellent!
                </p>
              </div>

              {/* Processing time */}
              <p className="text-xs text-gray-500 text-center">
                Processed in {(tailoringResult.processingTimeMs / 1000).toFixed(1)} seconds
              </p>

              <div className="flex justify-center pt-4 border-t">
                <button
                  onClick={handleFinish}
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 flex items-center gap-2"
                >
                  View Application Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
