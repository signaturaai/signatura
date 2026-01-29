'use client'

/**
 * Candidate Dashboard - Base44 Migration
 *
 * Feature-complete dashboard with:
 * - Header Cards: 4 metrics (Total, Active, Interviews, CV Versions)
 * - Central Feature: CompanionChat (Glassmorphic)
 * - Activity & Actions widgets
 * - Recent Activity feed
 */

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import {
  Briefcase,
  Target,
  Calendar,
  FileText,
  Mic,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  mockJobApplications,
  mockCVVersions,
  mockDashboardMetrics,
  mockActivityItems,
  mockQuickActions,
} from '@/lib/data/mockData'
import type { ApplicationStatus } from '@/lib/types/dashboard'

// Status colors and icons mapping
const statusConfig: Record<ApplicationStatus, { color: string; bgColor: string; icon: typeof CheckCircle }> = {
  prepared: { color: 'text-text-secondary', bgColor: 'bg-muted', icon: Clock },
  applied: { color: 'text-sky-dark', bgColor: 'bg-sky-light', icon: Briefcase },
  interview_scheduled: { color: 'text-lavender-dark', bgColor: 'bg-lavender-light', icon: Calendar },
  interviewed: { color: 'text-lavender-dark', bgColor: 'bg-lavender-light', icon: CheckCircle },
  offer_received: { color: 'text-success-dark', bgColor: 'bg-success-light', icon: Sparkles },
  negotiating: { color: 'text-peach-dark', bgColor: 'bg-peach-light', icon: DollarSign },
  accepted: { color: 'text-success-dark', bgColor: 'bg-success-light', icon: CheckCircle },
  rejected: { color: 'text-error-dark', bgColor: 'bg-error-light', icon: XCircle },
  withdrawn: { color: 'text-text-tertiary', bgColor: 'bg-muted', icon: XCircle },
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format status for display
function formatStatus(status: ApplicationStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Icon component mapping
const iconMap: Record<string, typeof Briefcase> = {
  FileText,
  Mic,
  Plus,
  DollarSign,
}

export default function DashboardPage() {
  const metrics = mockDashboardMetrics
  const activities = mockActivityItems.slice(0, 5)
  const recentApplications = mockJobApplications.slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">Welcome back! Here&apos;s your job search overview.</p>
        </div>
        <Button asChild className="bg-lavender hover:bg-lavender-dark text-white">
          <Link href="/applications?new=true">
            <Plus className="h-4 w-4 mr-2" />
            Add Application
          </Link>
        </Button>
      </div>

      {/* Header Cards - 4 Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <Card className="bg-gradient-to-br from-sky-light to-sky/30 border-sky/30 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-dark">Total Applications</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{metrics.totalApplications}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/60 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-sky-dark" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-sky-dark">
              <TrendingUp className="h-3 w-3" />
              <span>+3 this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Applications */}
        <Card className="bg-gradient-to-br from-peach-light to-peach/30 border-peach/30 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-peach-dark">Active</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{metrics.activeApplications}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/60 flex items-center justify-center">
                <Target className="h-6 w-6 text-peach-dark" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-peach-dark">
              <span>In progress</span>
            </div>
          </CardContent>
        </Card>

        {/* Interviews Scheduled */}
        <Card className="bg-gradient-to-br from-lavender-light to-lavender/30 border-lavender/30 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-lavender-dark">Interviews</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{metrics.interviewsScheduled}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/60 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-lavender-dark" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-lavender-dark">
              <span>Scheduled</span>
            </div>
          </CardContent>
        </Card>

        {/* CV Versions */}
        <Card className="bg-gradient-to-br from-success-light to-success/30 border-success/30 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-success-dark">CV Versions</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{metrics.cvVersions}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/60 flex items-center justify-center">
                <FileText className="h-6 w-6 text-success-dark" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-success-dark">
              <span>Tailored</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid - Companion + Activity/Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Companion Chat - Center/Left (Takes 2 columns on large screens) */}
        <div className="lg:col-span-2">
          <Card className="h-full min-h-[500px] bg-gradient-to-br from-rose-light/20 via-white to-lavender-light/20 border-rose-light/30 shadow-soft-md overflow-hidden">
            <CardHeader className="pb-3 border-b border-rose-light/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-rose-light flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-rose-dark" />
                  </div>
                  Daily Companion
                </CardTitle>
                <Link href="/companion">
                  <Button variant="ghost" size="sm" className="text-rose-dark hover:bg-rose-light/30">
                    Open Full View
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Mini Companion Preview */}
              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-soft border border-white/50">
                  <p className="text-text-primary leading-relaxed">
                    Good morning! You have <strong>3 interviews</strong> scheduled this week.
                    The Databricks offer is waiting for your response.
                    How are you feeling about your options?
                  </p>
                  <p className="text-xs text-text-tertiary mt-2">Just now</p>
                </div>

                {/* Offer Highlight */}
                {metrics.offersReceived > 0 && (
                  <div className="bg-gradient-to-br from-success-light/50 to-white/50 backdrop-blur-sm rounded-2xl p-4 border border-success/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-success-dark" />
                      <span className="text-sm font-medium text-success-dark">Pending Offer</span>
                    </div>
                    <p className="text-sm text-text-primary">
                      Databricks - Director of Product, AI/ML
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="success" asChild>
                        <Link href="/compensation">Review Offer</Link>
                      </Button>
                      <Button size="sm" variant="outline">
                        Need Time
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-sky-dark">{metrics.activeApplications}</p>
                    <p className="text-xs text-text-secondary">Active</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-lavender-dark">{metrics.interviewsScheduled}</p>
                    <p className="text-xs text-text-secondary">Interviews</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-success-dark">{metrics.offersReceived}</p>
                    <p className="text-xs text-text-secondary">Offers</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-soft border-lavender-light/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-text-primary">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                {mockQuickActions.map((action) => {
                  const Icon = iconMap[action.icon] || Briefcase
                  return (
                    <Link
                      key={action.id}
                      href={action.href}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200',
                        action.bgColor,
                        'hover:shadow-soft hover:scale-[1.02]'
                      )}
                    >
                      <Icon className={cn('h-6 w-6 mb-2', action.color)} />
                      <span className={cn('text-sm font-medium', action.color)}>{action.label}</span>
                      <span className="text-xs text-text-tertiary mt-0.5">{action.description}</span>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card className="shadow-soft border-sky-light/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-text-primary">Recent Activity</CardTitle>
                <Link href="/applications" className="text-xs text-sky-dark hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-sky-light/20 transition-colors"
                  >
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        activity.type === 'offer'
                          ? 'bg-success-light'
                          : activity.type === 'interview'
                          ? 'bg-lavender-light'
                          : activity.type === 'status_change' && activity.status === 'rejected'
                          ? 'bg-error-light'
                          : 'bg-sky-light'
                      )}
                    >
                      {activity.type === 'offer' ? (
                        <Sparkles className="h-4 w-4 text-success-dark" />
                      ) : activity.type === 'interview' ? (
                        <Calendar className="h-4 w-4 text-lavender-dark" />
                      ) : activity.status === 'rejected' ? (
                        <XCircle className="h-4 w-4 text-error-dark" />
                      ) : (
                        <Briefcase className="h-4 w-4 text-sky-dark" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{activity.title}</p>
                      <p className="text-xs text-text-secondary truncate">{activity.description}</p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Applications Table */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-text-primary">Recent Applications</CardTitle>
            <Link href="/applications">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
                View All ({mockJobApplications.length})
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rose-light/30">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Company</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Position</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Applied</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Salary</th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => {
                  const config = statusConfig[app.application_status]
                  const StatusIcon = config.icon
                  return (
                    <tr
                      key={app.id}
                      className="border-b border-rose-light/20 hover:bg-rose-light/10 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-lavender-light to-sky-light flex items-center justify-center font-semibold text-lavender-dark">
                            {app.company_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{app.company_name}</p>
                            <p className="text-xs text-text-tertiary">{app.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-text-primary">{app.position_title}</p>
                        {app.industry && (
                          <p className="text-xs text-text-tertiary">{app.industry}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                            config.bgColor,
                            config.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {formatStatus(app.application_status)}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-text-secondary">
                          {formatRelativeTime(app.application_date)}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-text-primary">{app.salary_range || 'Not specified'}</p>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/applications/${app.id}`}>
                            View
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
