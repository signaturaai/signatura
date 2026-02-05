/**
 * Candidate Dashboard Page — The strategic command center for job seekers
 *
 * Route: /dashboard/candidate
 *
 * Features:
 * - Personalized greeting with target role
 * - Narrative Compass (radar chart) showing alignment
 * - Quick Actions cards
 * - Applications Hub preview
 * - Interview History preview
 */
import { CandidateDashboard } from '@/components/dashboard'
import type { NarrativeScores } from '@/components/dashboard'
import type { InterviewSession } from '@/components/dashboard'
import type { JobApplication, DashboardMetrics } from '@/lib/types/dashboard'
import { mockJobApplications, mockDashboardMetrics } from '@/lib/data/mockData'

export const metadata = {
  title: 'Dashboard | Signatura',
  description: 'Your strategic command center for job search success',
}

// Demo data - in production these would come from Supabase/server
const demoNarrativeScores: NarrativeScores = {
  verbs: 72,
  achievements: 65,
  quantified: 45,
  brand: 58,
}

const demoTargetScores: NarrativeScores = {
  verbs: 85,
  achievements: 80,
  quantified: 75,
  brand: 80,
}

const demoInterviewSessions: InterviewSession[] = [
  {
    id: 'is-001',
    company_name: 'Databricks',
    position_title: 'Director of Product, AI/ML',
    session_type: 'mock_interview',
    overall_score: 82,
    session_duration: 45,
    questions_asked: 12,
    confidence_before: 65,
    confidence_after: 78,
    strengths: ['Strong strategic thinking', 'Clear communication'],
    improvements: ['Add more specific metrics', 'Slow down delivery pace'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    job_application_id: 'app-001',
  },
  {
    id: 'is-002',
    company_name: 'Stripe',
    position_title: 'Senior Product Manager',
    session_type: 'behavioral_prep',
    overall_score: 75,
    session_duration: 30,
    questions_asked: 8,
    confidence_before: 60,
    confidence_after: 72,
    strengths: ['Good STAR format usage'],
    improvements: ['Be more concise', 'Practice leadership examples'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'is-003',
    company_name: 'Figma',
    position_title: 'Product Lead, Collaboration',
    session_type: 'practice_questions',
    overall_score: 68,
    session_duration: 20,
    questions_asked: 6,
    confidence_before: 55,
    confidence_after: 65,
    strengths: ['Creative problem solving'],
    improvements: ['Structure answers better', 'Quantify impact more'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
]

export default function CandidateDashboardPage() {
  // In production, fetch from Supabase based on authenticated user
  const userName = 'Alex Chen'
  const targetRole = 'VP of Product'

  // Use mock data, adding session_connections to make data richer
  const applications: JobApplication[] = mockJobApplications.map((app, idx) => ({
    ...app,
    session_connections: {
      cv_completed: idx < 4,
      interview_completed: idx < 3,
      compensation_completed: idx < 2,
      contract_completed: idx < 1,
    },
  }))

  const metrics: DashboardMetrics = {
    ...mockDashboardMetrics,
    offersReceived: 1,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-light/20 via-white to-peach-light/20 p-6 lg:p-8">
      <CandidateDashboard
        userName={userName}
        targetRole={targetRole}
        currentNarrativeScores={demoNarrativeScores}
        targetNarrativeScores={demoTargetScores}
        applications={applications}
        interviewSessions={demoInterviewSessions}
        metrics={metrics}
      />
    </div>
  )
}
