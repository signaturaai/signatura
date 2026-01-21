'use client'

/**
 * Applications Page
 *
 * Track and manage job applications with integrated CV tailoring wizard.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { NewApplicationWizard } from '@/components/applications'
import {
  Briefcase,
  Plus,
  Loader2,
  Building2,
  Calendar,
  Star,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface Application {
  id: string
  company_name: string
  position_title: string
  status: string
  priority: string
  excitement_level: number | null
  industry: string | null
  job_url: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  preparing: 'bg-gray-100 text-gray-700',
  applied: 'bg-blue-100 text-blue-700',
  interviewing: 'bg-purple-100 text-purple-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-yellow-100 text-yellow-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-gray-500',
}

export default function ApplicationsPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/applications')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch applications')
      }

      setApplications(data.applications || [])
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleWizardClose = () => {
    setShowWizard(false)
    // Refresh applications list when wizard closes
    fetchApplications()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Track your job applications. I&apos;ll help you stay organized.
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
            <Button
              variant="outline"
              onClick={fetchApplications}
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && applications.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              No applications yet
            </CardTitle>
            <CardDescription>
              Start tracking your job search journey. Add your first application to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When you add applications, I&apos;ll help you:
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Track status and follow-ups
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Tailor your CV automatically for each role
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Generate professional follow-up emails
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Celebrate wins and support you through rejections
              </li>
            </ul>

            <Button onClick={() => setShowWizard(true)} className="mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Application
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {!loading && !error && applications.length > 0 && (
        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold">{applications.length}</div>
              <div className="text-sm text-gray-500">Total Applications</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {applications.filter((a) => a.status === 'applied').length}
              </div>
              <div className="text-sm text-gray-500">Applied</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {applications.filter((a) => a.status === 'interviewing').length}
              </div>
              <div className="text-sm text-gray-500">Interviewing</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {applications.filter((a) => a.status === 'offer').length}
              </div>
              <div className="text-sm text-gray-500">Offers</div>
            </Card>
          </div>

          {/* Applications Grid */}
          <div className="grid gap-4">
            {applications.map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{app.position_title}</h3>
                          {app.priority && (
                            <Star
                              className={`w-4 h-4 ${PRIORITY_COLORS[app.priority] || ''}`}
                              fill={app.priority === 'high' ? 'currentColor' : 'none'}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Building2 className="w-4 h-4" />
                          {app.company_name}
                          {app.job_url && (
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {app.status}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(app.created_at)}
                        </div>
                      </div>
                    </div>

                    {app.excitement_level && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Excitement:</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-32">
                          <div
                            className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full"
                            style={{ width: `${app.excitement_level * 10}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{app.excitement_level}/10</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* New Application Wizard Modal */}
      <NewApplicationWizard isOpen={showWizard} onClose={handleWizardClose} />
    </div>
  )
}
