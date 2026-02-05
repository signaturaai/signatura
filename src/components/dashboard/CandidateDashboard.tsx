/**
 * CandidateDashboard — The strategic command center for job seekers
 *
 * Features:
 * - Personalized greeting with target role
 * - Narrative Compass (radar chart) showing alignment
 * - Quick Actions cards
 * - Applications Hub preview
 * - Interview History preview
 *
 * This replaces the old "admin-style" dashboard with a modern,
 * narrative-driven experience.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Target,
  FileText,
  MessageSquare,
  TrendingUp,
  Briefcase,
  Calendar,
  DollarSign,
  ChevronRight,
  Zap,
  Brain,
  Plus,
} from 'lucide-react'
import { NarrativeCompassChart, type NarrativeScores } from './NarrativeCompassChart'
import { ApplicationsHub, type InterviewSession } from './ApplicationsHub'
import { InterviewHistory } from './InterviewHistory'
import type { JobApplication, DashboardMetrics } from '@/lib/types/dashboard'

interface CandidateDashboardProps {
  userName: string
  targetRole: string
  currentNarrativeScores: NarrativeScores
  targetNarrativeScores: NarrativeScores
  applications: JobApplication[]
  interviewSessions: InterviewSession[]
  metrics: DashboardMetrics
}

/** Quick action card component */
function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  color,
  badge,
}: {
  icon: typeof FileText
  title: string
  description: string
  href: string
  color: string
  badge?: string
}) {
  const router = useRouter()

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(href)}
      className="relative bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4 text-left hover:shadow-md hover:border-lavender-light/50 transition-all group"
    >
      {badge && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-rose text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
      <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="font-semibold text-gray-800 group-hover:text-lavender-dark transition-colors">
        {title}
      </h3>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </motion.button>
  )
}

/** Metric card component */
function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: typeof Briefcase
  label: string
  value: string | number
  subValue?: string
  color: string
}) {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {subValue && (
          <span className="text-xs text-emerald-500 font-medium">{subValue}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export function CandidateDashboard({
  userName,
  targetRole,
  currentNarrativeScores,
  targetNarrativeScores,
  applications,
  interviewSessions,
  metrics,
}: CandidateDashboardProps) {
  const router = useRouter()
  const firstName = userName.split(' ')[0] || 'there'

  // Calculate greeting based on time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Recent applications (last 5)
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Overall narrative alignment
  const overallAlignment = Math.round(
    (currentNarrativeScores.verbs +
      currentNarrativeScores.achievements +
      currentNarrativeScores.quantified +
      currentNarrativeScores.brand) / 4
  )

  return (
    <div className="space-y-8">
      {/* Header with greeting */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl lg:text-3xl font-bold text-gray-800"
          >
            {greeting}, {firstName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 mt-1"
          >
            Your journey to <span className="font-semibold text-lavender-dark">{targetRole}</span> continues.
          </motion.p>
        </div>

        {/* Narrative alignment badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 px-5 py-3"
        >
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
            overallAlignment >= 70 ? 'bg-emerald-100' : overallAlignment >= 40 ? 'bg-amber-100' : 'bg-rose-100'
          }`}>
            <Target className={`h-6 w-6 ${
              overallAlignment >= 70 ? 'text-emerald-600' : overallAlignment >= 40 ? 'text-amber-600' : 'text-rose-600'
            }`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Narrative Alignment</p>
            <p className={`text-xl font-bold ${
              overallAlignment >= 70 ? 'text-emerald-600' : overallAlignment >= 40 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {overallAlignment}%
            </p>
          </div>
        </motion.div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Compass + Quick Actions */}
        <div className="space-y-6">
          {/* Narrative Compass */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Your Narrative Compass</h2>
              <button
                onClick={() => router.push('/cv/narrative')}
                className="text-xs text-lavender-dark hover:underline"
              >
                Calibrate →
              </button>
            </div>
            <NarrativeCompassChart
              currentScores={currentNarrativeScores}
              targetScores={targetNarrativeScores}
              size={260}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              icon={FileText}
              title="Tailor CV"
              description="Match your story to any job"
              href="/cv/tailor"
              color="bg-gradient-to-br from-peach to-peach-dark"
            />
            <QuickActionCard
              icon={Brain}
              title="Interview"
              description="Practice with Hunter Logic"
              href="/interview/strategic"
              color="bg-gradient-to-br from-lavender to-lavender-dark"
              badge={interviewSessions.length > 0 ? `${interviewSessions.length}` : undefined}
            />
            <QuickActionCard
              icon={Plus}
              title="New App"
              description="Track an application"
              href="/applications?new=true"
              color="bg-gradient-to-br from-rose to-rose-dark"
            />
            <QuickActionCard
              icon={DollarSign}
              title="Negotiate"
              description="Compensation insights"
              href="/compensation"
              color="bg-gradient-to-br from-sky to-sky-dark"
            />
          </div>
        </div>

        {/* Center column: Applications Hub */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={Briefcase}
              label="Total Applications"
              value={metrics.totalApplications}
              color="bg-gradient-to-br from-lavender to-lavender-dark"
            />
            <MetricCard
              icon={Zap}
              label="Active"
              value={metrics.activeApplications}
              subValue={metrics.activeApplications > 0 ? 'In progress' : undefined}
              color="bg-gradient-to-br from-sky to-sky-dark"
            />
            <MetricCard
              icon={Calendar}
              label="Interviews"
              value={metrics.interviewsScheduled}
              color="bg-gradient-to-br from-rose to-rose-dark"
            />
            <MetricCard
              icon={Sparkles}
              label="Offers"
              value={metrics.offersReceived}
              subValue={metrics.offersReceived > 0 ? '🎉' : undefined}
              color="bg-gradient-to-br from-emerald-400 to-emerald-600"
            />
          </div>

          {/* Applications preview */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Recent Applications</h2>
              <button
                onClick={() => router.push('/applications')}
                className="text-xs text-lavender-dark hover:underline flex items-center gap-1"
              >
                View All
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {recentApps.length > 0 ? (
              <div className="space-y-2">
                {recentApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => router.push(`/applications/${app.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-lavender-light/10 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-lavender-light/50 to-peach-light/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-lavender-dark">
                        {app.company_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate text-sm">
                        {app.position_title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {app.company_name}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      app.application_status === 'offer_received' ? 'bg-emerald-50 text-emerald-600' :
                      app.application_status === 'interview_scheduled' ? 'bg-lavender-light/30 text-lavender-dark' :
                      app.application_status === 'applied' ? 'bg-sky-50 text-sky-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {app.application_status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No applications yet</p>
                <button
                  onClick={() => router.push('/applications?new=true')}
                  className="mt-3 text-xs text-lavender-dark hover:underline"
                >
                  Add your first application
                </button>
              </div>
            )}
          </div>

          {/* Interview History preview */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
            <InterviewHistory
              sessions={interviewSessions}
              onNewSession={() => router.push('/interview/strategic')}
              limit={3}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
