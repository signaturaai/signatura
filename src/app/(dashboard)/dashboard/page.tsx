import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from './DashboardContent'
import { DashboardSkeleton } from './DashboardSkeleton'

/**
 * Candidate Dashboard - Base44 Migration
 *
 * Feature-complete dashboard with:
 * - Header Cards: 4 metrics (Total, Active, Interviews, CV Versions) - CLICKABLE
 * - Central Feature: CompanionChat (Glassmorphic)
 * - Activity & Actions widgets
 * - Recent Activity feed
 */

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <DashboardSkeleton />
  }

  // Fetch real data from Supabase in parallel
  const [applicationsResult, cvVersionsResult, profileResult] = await Promise.all([
    (supabase
      .from('job_applications') as any)
      .select('id, application_status, company_name, position_title, location, industry, salary_range, application_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    (supabase
      .from('base_cvs') as any)
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    (supabase
      .from('profiles') as any)
      .select('full_name')
      .eq('id', user.id)
      .single(),
  ])

  const applications = (applicationsResult.data || []) as Array<{
    id: string
    application_status: string
    company_name: string
    position_title: string
    location?: string
    industry?: string
    salary_range?: string
    application_date: string
    created_at: string
  }>
  const cvVersions = (cvVersionsResult.data || []) as Array<{ id: string; name: string; created_at: string }>
  const userName = (profileResult.data?.full_name || user.email?.split('@')[0] || 'there') as string

  // Calculate real metrics
  const totalApplications = applications.length
  const activeApplications = applications.filter(
    app => !['rejected', 'withdrawn', 'accepted'].includes(app.application_status)
  ).length
  const interviewsScheduled = applications.filter(
    app => app.application_status === 'interview_scheduled'
  ).length
  const offersReceived = applications.filter(
    app => ['offer_received', 'negotiating'].includes(app.application_status)
  ).length
  const cvVersionsCount = cvVersions.length

  // Calculate content match and narrative match (placeholder - would be from analysis)
  const contentMatchPercent = totalApplications > 0 ? 78 : 0
  const narrativeMatchPercent = totalApplications > 0 ? 72 : 0

  const metrics = {
    totalApplications,
    activeApplications,
    interviewsScheduled,
    cvVersions: cvVersionsCount,
    offersReceived,
    contentMatchPercent,
    narrativeMatchPercent,
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent
        userName={userName}
        applications={applications}
        metrics={metrics}
      />
    </Suspense>
  )
}
