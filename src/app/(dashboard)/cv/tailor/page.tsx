'use client'

/**
 * CV Tailor - "Best of Both Worlds"
 *
 * Interactive page for tailoring a CV to a specific job description.
 * Guarantees the final CV is at least as good as the original.
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { TailoringResultsDisplay } from '@/components/cv'
import { TailoringResult } from '@/lib/cv'
import { Sparkles, FileText, Briefcase, Loader2, ArrowLeft, Info, Brain, Target, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { usePMAnalysis } from '@/hooks/usePMAnalysis'
import { getPrinciplesForContext } from '@/lib/ai/siggy-pm-intelligence'

const INDUSTRIES = [
  { value: 'generic', label: 'General / Other' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
]

export default function CVTailorPage() {
  const [baseCVText, setBaseCVText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [industry, setIndustry] = useState('generic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TailoringResult | null>(null)
  const [showPMPanel, setShowPMPanel] = useState(false)

  // PM Intelligence: Real-time analysis of CV text
  const { analysis: pmAnalysis, isAnalyzing: isPMAnalyzing } = usePMAnalysis(baseCVText)
  const cvPrinciples = getPrinciplesForContext('cvTailor')

  const canSubmit =
    baseCVText.length >= 100 && jobDescription.length >= 50 && !isLoading

  const handleSubmit = async () => {
    if (!canSubmit) return

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

  // Show results if we have them
  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Tailor Another CV
          </Button>
        </div>

        <TailoringResultsDisplay result={result} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/cv"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CV
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Tailor Your CV</h1>
        <p className="text-muted-foreground">
          Get an optimized CV that&apos;s guaranteed to be as good or better than your original.
        </p>
      </div>

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
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Your Current CV
            </CardTitle>
            <CardDescription>
              Paste your current CV text. The more complete, the better the analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              Paste the job description you&apos;re applying for. Include requirements and responsibilities.
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
              Tailoring Your CV...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Tailor My CV
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
    </div>
  )
}
