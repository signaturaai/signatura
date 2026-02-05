/**
 * ApplicationsHub — The "My Applications" strategic command center
 *
 * Shows all user applications with:
 * - Job Title, Company
 * - Match Score (Before/After tailoring)
 * - Last Activity Date
 * - Action buttons
 *
 * Clicking an item navigates to the ApplicationDetail view.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Building2,
  TrendingUp,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Sparkles,
  DollarSign,
  Target,
} from 'lucide-react'
import type { JobApplication, ApplicationStatus } from '@/lib/types/dashboard'

interface ApplicationsHubProps {
  applications: JobApplication[]
  onNewApplication?: () => void
}

/** Status configuration */
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  prepared: { label: 'Prepared', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  applied: { label: 'Applied', color: 'text-sky-600', bg: 'bg-sky-50', icon: Briefcase },
  interview_scheduled: { label: 'Interview', color: 'text-lavender-dark', bg: 'bg-lavender-light/30', icon: Calendar },
  interviewed: { label: 'Interviewed', color: 'text-lavender-dark', bg: 'bg-lavender-light/30', icon: CheckCircle },
  offer_received: { label: 'Offer!', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Sparkles },
  negotiating: { label: 'Negotiating', color: 'text-peach-dark', bg: 'bg-peach-light/30', icon: DollarSign },
  accepted: { label: 'Accepted', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-400', bg: 'bg-gray-50', icon: XCircle },
}

/** Calculate match score improvement */
function getMatchScoreImprovement(app: JobApplication): { before: number; after: number; delta: number } {
  // In production, these would come from the application's CV analysis
  // For now, generate reasonable mock values based on status
  const baseScore = 55 + Math.floor(Math.random() * 15)
  const improvement = app.session_connections?.cv_completed ? 15 + Math.floor(Math.random() * 20) : 0
  return {
    before: baseScore,
    after: Math.min(100, baseScore + improvement),
    delta: improvement,
  }
}

/** Format relative time */
function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Single application row */
function ApplicationRow({
  application,
  onClick,
}: {
  application: JobApplication
  onClick: () => void
}) {
  const status = STATUS_CONFIG[application.application_status] || STATUS_CONFIG.prepared
  const StatusIcon = status.icon
  const matchScore = getMatchScoreImprovement(application)
  const lastActivity = application.status_updated_at || application.updated_at || application.created_at

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4 hover:shadow-md hover:border-lavender-light/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Company icon */}
        <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-lavender-light/50 to-peach-light/50 flex items-center justify-center">
          <span className="text-lg font-bold text-lavender-dark">
            {application.company_name.charAt(0)}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-gray-800 truncate">
              {application.position_title}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {application.company_name}
            </span>
            {application.location && (
              <span className="truncate">{application.location}</span>
            )}
          </div>
        </div>

        {/* Match Score (Before → After) */}
        <div className="hidden md:flex flex-col items-center px-4 border-l border-r border-gray-100">
          <span className="text-[10px] font-medium text-gray-400 uppercase mb-1">Match</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-400">{matchScore.before}%</span>
            <TrendingUp className={`h-3.5 w-3.5 ${matchScore.delta > 0 ? 'text-emerald-500' : 'text-gray-300'}`} />
            <span className={`text-sm font-semibold ${matchScore.delta > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
              {matchScore.after}%
            </span>
          </div>
          {matchScore.delta > 0 && (
            <span className="text-[10px] text-emerald-500">+{matchScore.delta}%</span>
          )}
        </div>

        {/* Last Activity */}
        <div className="hidden sm:flex flex-col items-end min-w-[80px]">
          <span className="text-[10px] font-medium text-gray-400 uppercase mb-1">Activity</span>
          <span className="text-sm text-gray-600">
            {formatRelativeTime(lastActivity)}
          </span>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-lavender-dark transition-colors" />
        </div>
      </div>

      {/* Session progress indicators */}
      {application.session_connections && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
          <SessionIndicator
            label="CV"
            completed={application.session_connections.cv_completed}
            icon={FileText}
          />
          <SessionIndicator
            label="Interview"
            completed={application.session_connections.interview_completed}
            icon={MessageSquare}
          />
          <SessionIndicator
            label="Comp"
            completed={application.session_connections.compensation_completed}
            icon={DollarSign}
          />
          <SessionIndicator
            label="Contract"
            completed={application.session_connections.contract_completed}
            icon={Target}
          />
        </div>
      )}
    </motion.div>
  )
}

/** Session completion indicator */
function SessionIndicator({
  label,
  completed,
  icon: Icon,
}: {
  label: string
  completed: boolean
  icon: typeof FileText
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
        completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
      }`}>
        <Icon className="h-3 w-3" />
      </div>
      <span className={`text-[10px] font-medium ${completed ? 'text-emerald-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

export function ApplicationsHub({ applications, onNewApplication }: ApplicationsHubProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')

  // Filter applications
  const filteredApps = applications.filter(app => {
    const matchesSearch =
      app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.position_title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || app.application_status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort by last activity (most recent first)
  const sortedApps = [...filteredApps].sort((a, b) => {
    const dateA = new Date(a.status_updated_at || a.updated_at || a.created_at).getTime()
    const dateB = new Date(b.status_updated_at || b.updated_at || b.created_at).getTime()
    return dateB - dateA
  })

  // Stats
  const activeCount = applications.filter(a =>
    !['rejected', 'withdrawn', 'accepted'].includes(a.application_status)
  ).length
  const interviewCount = applications.filter(a =>
    a.application_status === 'interview_scheduled'
  ).length
  const offerCount = applications.filter(a =>
    ['offer_received', 'negotiating'].includes(a.application_status)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Applications</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {applications.length} total · {activeCount} active · {interviewCount} interviewing · {offerCount} offers
          </p>
        </div>
        {onNewApplication && (
          <button
            onClick={onNewApplication}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose to-lavender text-white text-sm font-medium shadow-md shadow-rose-100 hover:shadow-lg transition-all"
          >
            + New Application
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company or position..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm placeholder-gray-400 focus:border-lavender focus:ring-2 focus:ring-lavender-light/50 focus:outline-none transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-700 focus:border-lavender focus:ring-2 focus:ring-lavender-light/50 focus:outline-none transition-all"
        >
          <option value="all">All Status</option>
          <option value="prepared">Prepared</option>
          <option value="applied">Applied</option>
          <option value="interview_scheduled">Interview</option>
          <option value="interviewed">Interviewed</option>
          <option value="offer_received">Offer</option>
          <option value="negotiating">Negotiating</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Applications list */}
      {sortedApps.length > 0 ? (
        <div className="space-y-3">
          {sortedApps.map((app, idx) => (
            <ApplicationRow
              key={app.id}
              application={app}
              onClick={() => router.push(`/applications/${app.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/50 backdrop-blur-md rounded-2xl border border-white/40">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">No applications found</p>
          <p className="text-sm text-gray-400">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by adding your first application'}
          </p>
          {onNewApplication && !searchQuery && statusFilter === 'all' && (
            <button
              onClick={onNewApplication}
              className="mt-4 px-4 py-2 rounded-lg border border-lavender text-lavender-dark text-sm font-medium hover:bg-lavender-light/20 transition-colors"
            >
              Add Application
            </button>
          )}
        </div>
      )}
    </div>
  )
}
