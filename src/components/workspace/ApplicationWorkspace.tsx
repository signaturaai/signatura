/**
 * ApplicationWorkspace — The "Project View" for a specific job application
 *
 * A premium, tabbed interface for managing all aspects of a job application:
 * - Overview: JD, Notes, Strategic Narrative Gap
 * - CV Studio: Tailored CV with PDF preview & Edit mode
 * - Interview Lab: Interview sessions specific to this job
 * - Strategy: Hunter Logic insights and preparation tips
 *
 * Uses the same Glassmorphism/Lavender aesthetic as the dashboard.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Briefcase,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  DollarSign,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Play,
  Brain,
  Sparkles,
  AlertCircle,
  Lightbulb,
  Zap,
} from 'lucide-react'
import type { JobApplication, ApplicationStatus, CVVersion } from '@/lib/types/dashboard'
import type { InterviewSession } from '@/components/dashboard/InterviewHistory'

// Tab types
type WorkspaceTab = 'overview' | 'cv_studio' | 'interview_lab' | 'strategy'

// Status configuration
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  prepared: { label: 'Prepared', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  applied: { label: 'Applied', color: 'text-sky-600', bg: 'bg-sky-50', icon: Briefcase },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-lavender-dark', bg: 'bg-lavender-light/30', icon: Calendar },
  interviewed: { label: 'Interviewed', color: 'text-lavender-dark', bg: 'bg-lavender-light/30', icon: CheckCircle },
  offer_received: { label: 'Offer Received', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Sparkles },
  negotiating: { label: 'Negotiating', color: 'text-peach-dark', bg: 'bg-peach-light/30', icon: DollarSign },
  accepted: { label: 'Accepted', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-400', bg: 'bg-gray-50', icon: XCircle },
}

// Narrative gap analysis type
interface NarrativeGap {
  dimension: string
  current: number
  target: number
  gap: number
  status: 'aligned' | 'partial' | 'gap'
  suggestion: string
}

// Hunter Logic insight type
interface HunterInsight {
  category: 'strength' | 'weakness' | 'opportunity' | 'threat'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

interface ApplicationWorkspaceProps {
  application: JobApplication
  cvVersion?: CVVersion | null
  interviewSessions: InterviewSession[]
  narrativeGaps: NarrativeGap[]
  hunterInsights: HunterInsight[]
  matchScore: { before: number; after: number }
}

/** Tab button component */
function TabButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean
  icon: typeof FileText
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-white text-lavender-dark shadow-md'
          : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

/** Overview Tab Content */
function OverviewTab({
  application,
  narrativeGaps,
  matchScore,
}: {
  application: JobApplication
  narrativeGaps: NarrativeGap[]
  matchScore: { before: number; after: number }
}) {
  const [showFullJD, setShowFullJD] = useState(false)
  const jdPreview = application.job_description?.slice(0, 500) || ''

  return (
    <div className="space-y-6">
      {/* Job Description Card */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-lavender-dark" />
            Job Description
          </h3>
          {application.job_url && (
            <a
              href={application.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-lavender-dark hover:underline flex items-center gap-1"
            >
              View original
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {application.job_description ? (
          <div className="relative">
            <div className={`text-sm text-gray-700 whitespace-pre-wrap ${!showFullJD && application.job_description.length > 500 ? 'max-h-48 overflow-hidden' : ''}`}>
              {showFullJD ? application.job_description : jdPreview}
              {!showFullJD && application.job_description.length > 500 && '...'}
            </div>
            {application.job_description.length > 500 && (
              <button
                onClick={() => setShowFullJD(!showFullJD)}
                className="mt-2 text-xs text-lavender-dark hover:underline"
              >
                {showFullJD ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No job description added yet</p>
          </div>
        )}
      </div>

      {/* Notes Card */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Edit3 className="h-4 w-4 text-peach-dark" />
          Notes
        </h3>
        {application.notes || application.application_notes ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {application.notes || application.application_notes}
          </p>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">No notes added yet</p>
          </div>
        )}
      </div>

      {/* Narrative Gap Analysis */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Target className="h-4 w-4 text-rose" />
            Strategic Narrative Gap
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Match:</span>
            <span className="text-sm text-gray-400">{matchScore.before}%</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600">{matchScore.after}%</span>
          </div>
        </div>

        <div className="space-y-3">
          {narrativeGaps.map((gap, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-28">
                <span className="text-xs font-medium text-gray-600">{gap.dimension}</span>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      gap.status === 'aligned' ? 'bg-emerald-400' :
                      gap.status === 'partial' ? 'bg-amber-400' : 'bg-rose'
                    }`}
                    style={{ width: `${gap.current}%` }}
                  />
                </div>
              </div>
              <div className="flex-shrink-0 w-16 text-right">
                <span className={`text-xs font-medium ${
                  gap.status === 'aligned' ? 'text-emerald-600' :
                  gap.status === 'partial' ? 'text-amber-600' : 'text-rose'
                }`}>
                  {gap.current}% / {gap.target}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Gap suggestions */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recommendations</h4>
          <ul className="space-y-1.5">
            {narrativeGaps.filter(g => g.status !== 'aligned').slice(0, 2).map((gap, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>{gap.suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** CV Studio Tab Content */
function CVStudioTab({
  application,
  cvVersion,
  matchScore,
}: {
  application: JobApplication
  cvVersion?: CVVersion | null
  matchScore: { before: number; after: number }
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    // In production, copy the CV content
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {cvVersion ? (
        <>
          {/* Score Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Original Score</p>
              <p className="text-2xl font-bold text-gray-600">{matchScore.before}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200/50 p-4 text-center">
              <p className="text-xs text-emerald-600 mb-1">Tailored Score</p>
              <p className="text-2xl font-bold text-emerald-700">{matchScore.after}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Improvement</p>
              <p className="text-2xl font-bold text-sky-600">+{matchScore.after - matchScore.before}</p>
            </div>
          </div>

          {/* CV Preview Card */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-lavender-dark" />
                Tailored CV for {application.company_name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Mock PDF Preview */}
            <div className="bg-gray-50 rounded-xl p-6 min-h-[400px] border border-gray-100">
              <div className="text-center text-gray-400 py-16">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">CV Preview</p>
                <p className="text-xs mt-1">Version {cvVersion.version_number}</p>
                {cvVersion.ats_compatibility_score && (
                  <p className="text-xs mt-2 text-emerald-600">
                    ATS Score: {cvVersion.ats_compatibility_score}%
                  </p>
                )}
              </div>
            </div>

            {/* Edit button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => router.push(`/cv/tailor?application=${application.id}`)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-lavender to-lavender-dark text-white text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit in CV Studio
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tailored CV Yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Create a tailored CV specifically optimized for {application.position_title} at {application.company_name}
          </p>
          <button
            onClick={() => router.push(`/cv/tailor?application=${application.id}`)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-peach to-rose text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            Start Tailoring
          </button>
        </div>
      )}
    </div>
  )
}

/** Interview Lab Tab Content */
function InterviewLabTab({
  application,
  sessions,
}: {
  application: JobApplication
  sessions: InterviewSession[]
}) {
  const router = useRouter()

  // Filter sessions for this application
  const relevantSessions = sessions.filter(s => s.job_application_id === application.id)
  const otherSessions = sessions.filter(s => s.job_application_id !== application.id)

  return (
    <div className="space-y-6">
      {/* Start new session CTA */}
      <div className="bg-gradient-to-br from-lavender-light/30 to-peach-light/30 rounded-2xl border border-lavender-light/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Practice for {application.company_name}</h3>
            <p className="text-sm text-gray-600">
              Run a simulated interview tailored to this specific role and company.
            </p>
          </div>
          <button
            onClick={() => router.push(`/interview/arena?application=${application.id}`)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-lavender to-lavender-dark text-white text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Start Session
          </button>
        </div>
      </div>

      {/* Sessions for this application */}
      {relevantSessions.length > 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-lavender-dark" />
            Sessions for {application.company_name}
          </h3>
          <div className="space-y-3">
            {relevantSessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Other practice sessions */}
      {otherSessions.length > 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-peach-dark" />
            Other Practice Sessions
          </h3>
          <div className="space-y-3">
            {otherSessions.slice(0, 3).map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-12 text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Interview Sessions Yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Practice makes perfect! Start your first mock interview to prepare for {application.position_title}.
          </p>
        </div>
      )}
    </div>
  )
}

/** Session row for interview lab */
function SessionRow({ session }: { session: InterviewSession }) {
  const router = useRouter()
  const confidenceDelta = session.confidence_after - session.confidence_before

  return (
    <button
      onClick={() => router.push(`/interview/history/${session.id}`)}
      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-lavender-light/10 transition-colors text-left group"
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
        session.overall_score >= 80 ? 'bg-emerald-100 text-emerald-600' :
        session.overall_score >= 60 ? 'bg-sky-100 text-sky-600' :
        'bg-amber-100 text-amber-600'
      }`}>
        <span className="text-sm font-bold">{Math.round(session.overall_score)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm truncate group-hover:text-lavender-dark transition-colors">
          {session.session_type.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-gray-500">
          {session.questions_asked} questions · {session.session_duration}m
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs">
        {confidenceDelta > 0 ? (
          <>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-600">+{confidenceDelta}</span>
          </>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-lavender-dark transition-colors" />
    </button>
  )
}

/** Strategy Tab Content */
function StrategyTab({
  application,
  hunterInsights,
}: {
  application: JobApplication
  hunterInsights: HunterInsight[]
}) {
  const strengths = hunterInsights.filter(i => i.category === 'strength')
  const weaknesses = hunterInsights.filter(i => i.category === 'weakness')
  const opportunities = hunterInsights.filter(i => i.category === 'opportunity')
  const threats = hunterInsights.filter(i => i.category === 'threat')

  return (
    <div className="space-y-6">
      {/* Hunter Logic Header */}
      <div className="bg-gradient-to-br from-lavender-light/30 to-rose-light/30 rounded-2xl border border-lavender-light/50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-xl bg-white/80 flex items-center justify-center">
            <Brain className="h-6 w-6 text-lavender-dark" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Hunter Logic Analysis</h3>
            <p className="text-xs text-gray-600">Strategic insights for {application.position_title}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Our AI has analyzed the job requirements, your profile, and market data to provide targeted preparation strategies.
        </p>
      </div>

      {/* SWOT-style grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <InsightCard
          title="Strengths"
          subtitle="Leverage these in your interview"
          insights={strengths}
          color="emerald"
          icon={CheckCircle}
        />

        {/* Weaknesses */}
        <InsightCard
          title="Areas to Address"
          subtitle="Prepare responses for these gaps"
          insights={weaknesses}
          color="amber"
          icon={AlertCircle}
        />

        {/* Opportunities */}
        <InsightCard
          title="Opportunities"
          subtitle="Topics to proactively highlight"
          insights={opportunities}
          color="sky"
          icon={Lightbulb}
        />

        {/* Threats */}
        <InsightCard
          title="Watch Out"
          subtitle="Potential interviewer concerns"
          insights={threats}
          color="rose"
          icon={Zap}
        />
      </div>

      {/* Key talking points */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-lavender-dark" />
          Key Talking Points
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-lavender-light/50 text-lavender-dark text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <p className="text-sm text-gray-700">
              Lead with your experience in <span className="font-medium">{application.industry || 'the industry'}</span> and quantify your impact with specific metrics.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-lavender-light/50 text-lavender-dark text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <p className="text-sm text-gray-700">
              Connect your narrative to {application.company_name}&apos;s mission and recent initiatives.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-lavender-light/50 text-lavender-dark text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <p className="text-sm text-gray-700">
              Prepare a 90-day plan that demonstrates immediate value and strategic thinking.
            </p>
          </li>
        </ul>
      </div>
    </div>
  )
}

/** Insight card for strategy tab */
function InsightCard({
  title,
  subtitle,
  insights,
  color,
  icon: Icon,
}: {
  title: string
  subtitle: string
  insights: HunterInsight[]
  color: 'emerald' | 'amber' | 'sky' | 'rose'
  icon: typeof CheckCircle
}) {
  const colorClasses = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-500', title: 'text-emerald-800' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-500', title: 'text-amber-800' },
    sky: { bg: 'bg-sky-50', border: 'border-sky-100', icon: 'text-sky-500', title: 'text-sky-800' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'text-rose-500', title: 'text-rose-800' },
  }

  const classes = colorClasses[color]

  return (
    <div className={`${classes.bg} ${classes.border} border rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${classes.icon}`} />
        <h4 className={`font-semibold text-sm ${classes.title}`}>{title}</h4>
      </div>
      <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
      {insights.length > 0 ? (
        <ul className="space-y-2">
          {insights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${classes.icon.replace('text-', 'bg-')} mt-1.5 flex-shrink-0`} />
              <div>
                <p className="text-sm font-medium text-gray-700">{insight.title}</p>
                <p className="text-xs text-gray-500">{insight.description}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 italic">No insights identified</p>
      )}
    </div>
  )
}

/** Main ApplicationWorkspace component */
export function ApplicationWorkspace({
  application,
  cvVersion,
  interviewSessions,
  narrativeGaps,
  hunterInsights,
  matchScore,
}: ApplicationWorkspaceProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')

  const status = STATUS_CONFIG[application.application_status] || STATUS_CONFIG.prepared
  const StatusIcon = status.icon

  // Calculate interview badge count
  const interviewBadge = interviewSessions.filter(s => s.job_application_id === application.id).length

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push('/dashboard/candidate')}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Job info */}
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-lavender-light/50 to-peach-light/50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-lavender-dark">
                {application.company_name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{application.position_title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {application.company_name}
                </span>
                {application.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {application.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status & Score */}
          <div className="flex items-center gap-4">
            {/* Match Score */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-gray-100">
              <span className="text-xs text-gray-500">Match</span>
              <span className="text-lg font-bold text-emerald-600">{matchScore.after}%</span>
              {matchScore.after > matchScore.before && (
                <span className="text-xs text-emerald-500">+{matchScore.after - matchScore.before}</span>
              )}
            </div>

            {/* Status badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${status.bg}`}>
              <StatusIcon className={`h-4 w-4 ${status.color}`} />
              <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/40">
        <TabButton
          active={activeTab === 'overview'}
          icon={FileText}
          label="Overview"
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          active={activeTab === 'cv_studio'}
          icon={Edit3}
          label="CV Studio"
          badge={cvVersion ? undefined : 1}
          onClick={() => setActiveTab('cv_studio')}
        />
        <TabButton
          active={activeTab === 'interview_lab'}
          icon={MessageSquare}
          label="Interview Lab"
          badge={interviewBadge > 0 ? interviewBadge : undefined}
          onClick={() => setActiveTab('interview_lab')}
        />
        <TabButton
          active={activeTab === 'strategy'}
          icon={Brain}
          label="Strategy"
          onClick={() => setActiveTab('strategy')}
        />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              application={application}
              narrativeGaps={narrativeGaps}
              matchScore={matchScore}
            />
          )}
          {activeTab === 'cv_studio' && (
            <CVStudioTab
              application={application}
              cvVersion={cvVersion}
              matchScore={matchScore}
            />
          )}
          {activeTab === 'interview_lab' && (
            <InterviewLabTab
              application={application}
              sessions={interviewSessions}
            />
          )}
          {activeTab === 'strategy' && (
            <StrategyTab
              application={application}
              hunterInsights={hunterInsights}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
