'use client'

/**
 * Application Table View
 *
 * Renders job applications in a table format with sortable columns,
 * mini progress bars, and dynamic action buttons.
 */

import { Button } from '@/components/ui'
import type { JobApplication } from '@/lib/types/dashboard'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
}

interface ApplicationTableViewProps {
  applications: JobApplication[]
  columns: ColumnConfig[]
  onAction: (application: JobApplication, action: string) => void
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  prepared: 'bg-yellow-100 text-yellow-700',
  applied: 'bg-blue-100 text-blue-700',
  interview_scheduled: 'bg-purple-100 text-purple-700',
  interviewed: 'bg-indigo-100 text-indigo-700',
  offer_received: 'bg-green-100 text-green-700',
  negotiating: 'bg-teal-100 text-teal-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
}

const STATUS_LABELS: Record<string, string> = {
  prepared: 'Prepared',
  applied: 'Applied',
  interview_scheduled: 'Interview',
  interviewed: 'Interviewed',
  offer_received: 'Offer',
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
  status: string
): { label: string; variant: 'teal' | 'orange' } | null {
  switch (status) {
    case 'prepared':
      return { label: 'Tailor CV', variant: 'teal' }
    case 'applied':
    case 'interview_scheduled':
      return { label: 'Follow Up', variant: 'orange' }
    case 'interviewed':
      return { label: 'Check Status', variant: 'orange' }
    case 'offer_received':
    case 'negotiating':
      return { label: 'Review Offer', variant: 'teal' }
    default:
      return null
  }
}

// Company initials
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

export default function ApplicationTableView({
  applications,
  columns,
  onAction,
}: ApplicationTableViewProps) {
  const visibleColumns = columns.filter((col) => col.visible)

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No applications match your filters. Try adjusting your search criteria.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {visibleColumns.map((col) => (
              <th
                key={col.id}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {applications.map((app) => {
            const progress = getProgressPercentage(app.application_status)
            const actionButton = getActionButton(app.application_status)

            return (
              <tr
                key={app.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {visibleColumns.map((col) => (
                  <td key={col.id} className="px-4 py-4">
                    {col.id === 'company' && (
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-md bg-gradient-to-br from-lavender-light to-sky-light flex items-center justify-center text-lavender-dark font-semibold text-xs">
                          {getCompanyInitials(app.company_name)}
                        </div>
                        <div>
                          <Link
                            href={`/applications/${app.id}`}
                            className="font-medium text-text-primary hover:text-lavender-dark transition-colors flex items-center gap-1"
                          >
                            {app.company_name}
                            {app.job_url && (
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            )}
                          </Link>
                          {app.location && (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              {app.location}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {col.id === 'position' && (
                      <div>
                        <Link
                          href={`/applications/${app.id}`}
                          className="font-medium text-text-primary hover:text-lavender-dark transition-colors"
                        >
                          {app.position_title}
                        </Link>
                        {app.industry && (
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {app.industry}
                          </p>
                        )}
                      </div>
                    )}

                    {col.id === 'status' && (
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUS_BADGE_STYLES[app.application_status] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[app.application_status] || app.application_status}
                      </span>
                    )}

                    {col.id === 'next_step' && (
                      <div>
                        {actionButton ? (
                          <Button
                            onClick={() =>
                              onAction(
                                app,
                                app.application_status === 'prepared'
                                  ? 'tailor_cv'
                                  : 'follow_up'
                              )
                            }
                            size="sm"
                            className={`text-xs ${
                              actionButton.variant === 'teal'
                                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                          >
                            {actionButton.label}
                          </Button>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </div>
                    )}

                    {col.id === 'progress' && (
                      <div className="w-24">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                app.application_status === 'rejected'
                                  ? 'bg-red-400'
                                  : app.application_status === 'withdrawn'
                                    ? 'bg-gray-400'
                                    : app.application_status === 'accepted'
                                      ? 'bg-emerald-500'
                                      : 'bg-teal-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-tertiary w-8">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    )}

                    {col.id === 'applied_date' && (
                      <span className="text-sm text-text-secondary">
                        {formatDate(app.application_date)}
                      </span>
                    )}

                    {col.id === 'salary' && (
                      <span className="text-sm text-text-secondary">
                        {app.salary_range || '—'}
                      </span>
                    )}

                    {col.id === 'priority' && (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          app.priority_level === 'dream_job'
                            ? 'bg-rose-100 text-rose-700'
                            : app.priority_level === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : app.priority_level === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {app.priority_level === 'dream_job'
                          ? 'Dream Job'
                          : app.priority_level
                            ? app.priority_level.charAt(0).toUpperCase() +
                              app.priority_level.slice(1)
                            : '—'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
