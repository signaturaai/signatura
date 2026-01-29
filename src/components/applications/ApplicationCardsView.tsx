'use client'

/**
 * Application Cards View
 *
 * Renders job applications as vertical cards with progress bars,
 * status badges, and dynamic action buttons.
 */

import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import type { JobApplication } from '@/lib/types/dashboard'
import { Building2, Calendar, MapPin, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface ApplicationCardsViewProps {
  applications: JobApplication[]
  onAction: (application: JobApplication, action: string) => void
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  prepared: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  interview_scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
  interviewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  offer_received: 'bg-green-100 text-green-700 border-green-200',
  negotiating: 'bg-teal-100 text-teal-700 border-teal-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
}

const STATUS_LABELS: Record<string, string> = {
  prepared: 'Prepared',
  applied: 'Applied',
  interview_scheduled: 'Interview Scheduled',
  interviewed: 'Interviewed',
  offer_received: 'Offer Received',
  negotiating: 'Negotiating',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

// Calculate progress percentage based on status
function getProgressPercentage(status: string): number {
  const progressMap: Record<string, number> = {
    prepared: 15,
    applied: 30,
    interview_scheduled: 50,
    interviewed: 65,
    offer_received: 85,
    negotiating: 90,
    accepted: 100,
    rejected: 100,
    withdrawn: 100,
  }
  return progressMap[status] || 0
}

// Get dynamic action button based on status
function getActionButton(
  status: string,
  onAction: () => void
): { label: string; variant: 'teal' | 'orange' | 'gray'; onClick: () => void } | null {
  switch (status) {
    case 'prepared':
      return { label: 'Tailor CV', variant: 'teal', onClick: onAction }
    case 'applied':
    case 'interview_scheduled':
      return { label: 'Follow Up', variant: 'orange', onClick: onAction }
    case 'interviewed':
      return { label: 'Check Status', variant: 'orange', onClick: onAction }
    case 'offer_received':
    case 'negotiating':
      return { label: 'Review Offer', variant: 'teal', onClick: onAction }
    case 'rejected':
    case 'withdrawn':
    case 'accepted':
      return null
    default:
      return null
  }
}

// Company logo placeholder generator
function getCompanyInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ApplicationCardsView({
  applications,
  onAction,
}: ApplicationCardsViewProps) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No applications match your filters. Try adjusting your search criteria.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => {
        const progress = getProgressPercentage(app.application_status)
        const actionButton = getActionButton(app.application_status, () =>
          onAction(app, app.application_status === 'prepared' ? 'tailor_cv' : 'follow_up')
        )

        return (
          <Card
            key={app.id}
            className="hover:shadow-soft-md transition-shadow duration-200 border border-gray-100"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Company Logo / Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-lavender-light to-sky-light flex items-center justify-center text-lavender-dark font-semibold text-sm">
                  {getCompanyInitials(app.company_name)}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    {/* Title and Company */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/applications/${app.id}`}
                        className="block group"
                      >
                        <h3 className="font-semibold text-lg text-text-primary group-hover:text-lavender-dark transition-colors truncate">
                          {app.position_title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {app.company_name}
                        </span>
                        {app.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {app.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${
                        STATUS_BADGE_STYLES[app.application_status] ||
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[app.application_status] || app.application_status}
                    </span>
                  </div>

                  {/* Applied Date and Progress */}
                  <div className="mt-4 flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      <Calendar className="w-3.5 h-3.5" />
                      Applied on {formatDate(app.application_date)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Progress
                      </span>
                      <span className="text-xs font-medium text-text-primary">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          app.application_status === 'rejected'
                            ? 'bg-red-400'
                            : app.application_status === 'withdrawn'
                              ? 'bg-gray-400'
                              : app.application_status === 'accepted'
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-teal-500 to-sky-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  {actionButton && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={actionButton.onClick}
                        className={`${
                          actionButton.variant === 'teal'
                            ? 'bg-teal-600 hover:bg-teal-700 text-white'
                            : actionButton.variant === 'orange'
                              ? 'bg-orange-500 hover:bg-orange-600 text-white'
                              : 'bg-gray-500 hover:bg-gray-600 text-white'
                        }`}
                        size="sm"
                      >
                        {actionButton.label}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
