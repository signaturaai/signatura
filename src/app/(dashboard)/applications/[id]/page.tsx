'use client'

/**
 * Application Detail Page
 *
 * Shows details for a specific job application including tailored CV.
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Star,
  FileText,
  Loader2,
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'

interface Application {
  id: string
  company_name: string
  position_title: string
  job_description: string
  job_url: string | null
  status: string
  priority: string
  excitement_level: number | null
  industry: string | null
  source: string | null
  created_at: string
  updated_at: string
}

interface TailoringSession {
  id: string
  base_overall_score: number
  final_overall_score: number
  improvement: number
  sections_improved: number
  sections_kept_original: number
  final_cv_text: string
  status: string
  processing_time_ms: number
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'preparing', label: 'Preparing', color: 'bg-gray-100 text-gray-700' },
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-700' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-purple-100 text-purple-700' },
  { value: 'offer', label: 'Offer Received', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-yellow-100 text-yellow-700' },
]

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string

  const [application, setApplication] = useState<Application | null>(null)
  const [tailoringSession, setTailoringSession] = useState<TailoringSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch application details
        const appResponse = await fetch(`/api/applications/${applicationId}`)
        const appData = await appResponse.json()

        if (!appResponse.ok) {
          throw new Error(appData.error || 'Failed to fetch application')
        }

        setApplication(appData.application)

        // Fetch tailoring session if exists
        const tailorResponse = await fetch(`/api/cv/tailor?applicationId=${applicationId}`)
        const tailorData = await tailorResponse.json()

        if (tailorResponse.ok && tailorData.sessions?.length > 0) {
          setTailoringSession(tailorData.sessions[0])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load application')
      } finally {
        setLoading(false)
      }
    }

    if (applicationId) {
      fetchData()
    }
  }, [applicationId])

  const handleCopyCV = async () => {
    if (tailoringSession?.final_cv_text) {
      await navigator.clipboard.writeText(tailoringSession.final_cv_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="space-y-6">
        <Link
          href="/applications"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </Link>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error || 'Application not found'}</p>
            <Button variant="outline" onClick={() => router.push('/applications')} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === application.status)

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/applications"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {application.position_title}
            {application.priority === 'high' && (
              <Star className="w-5 h-5 text-red-500" fill="currentColor" />
            )}
          </h1>
          <div className="flex items-center gap-2 text-gray-600 mt-1">
            <Building2 className="w-4 h-4" />
            {application.company_name}
            {application.job_url && (
              <a
                href={application.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <span
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${currentStatus?.color || ''}`}
        >
          {currentStatus?.label || application.status}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Created</span>
          </div>
          <div className="font-medium">{formatDate(application.created_at)}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs">Industry</span>
          </div>
          <div className="font-medium capitalize">{application.industry || 'Generic'}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-xs">Priority</span>
          </div>
          <div className="font-medium capitalize">{application.priority}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Excitement</span>
          </div>
          <div className="font-medium">{application.excitement_level || '-'}/10</div>
        </Card>
      </div>

      {/* Tailored CV Section */}
      {tailoringSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Tailored CV
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardTitle>
            <CardDescription>
              Your CV has been optimized for this specific role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">Original</div>
                <div className="text-xl font-bold">
                  {tailoringSession.base_overall_score?.toFixed(1) || '-'}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-sm text-green-600">Final</div>
                <div className="text-xl font-bold text-green-700">
                  {tailoringSession.final_overall_score?.toFixed(1) || '-'}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-sm text-blue-600">Improved</div>
                <div className="text-xl font-bold text-blue-700">
                  +{tailoringSession.improvement?.toFixed(1) || '0'}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>
                {tailoringSession.sections_improved} sections improved
              </span>
              <span>|</span>
              <span>
                {tailoringSession.sections_kept_original} sections kept original
              </span>
              <span>|</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {((tailoringSession.processing_time_ms || 0) / 1000).toFixed(1)}s
              </span>
            </div>

            {/* CV Text */}
            {tailoringSession.final_cv_text && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCV}
                  className="absolute top-2 right-2"
                >
                  {copied ? 'Copied!' : 'Copy CV'}
                </Button>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {tailoringSession.final_cv_text}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job Description */}
      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm text-gray-700">
            {application.job_description}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
