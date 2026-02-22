/**
 * Subscription Trends API
 *
 * GET /api/subscription/trends
 *
 * Returns usage trends (monthly snapshots) for the current user.
 * Shows last 6 months of data with averages.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ResourceKey } from '@/hooks/useSubscription'

// ============================================================================
// Types
// ============================================================================

interface UsageTrendData {
  month: string
  applications: number
  cvs: number
  interviews: number
  compensation: number
  contracts: number
  aiAvatarInterviews: number
}

interface UsageTrendsResponse {
  trends: UsageTrendData[]
  averages: Record<ResourceKey, number>
  monthsTracked: number
}

// ============================================================================
// Handler
// ============================================================================

export async function GET(): Promise<NextResponse<UsageTrendsResponse | { error: string }>> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch last 6 months of snapshots
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const startMonth = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`

    const { data: snapshots, error: snapshotsError } = await supabase
      .from('usage_monthly_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .gte('snapshot_month', startMonth)
      .order('snapshot_month', { ascending: true })
      .limit(6)

    if (snapshotsError) {
      console.error('[Trends API] Error fetching snapshots:', snapshotsError)
      return NextResponse.json(
        { error: 'Failed to fetch usage trends' },
        { status: 500 }
      )
    }

    // Type assertion for Supabase query result
    interface SnapshotRow {
      snapshot_month: string
      applications_used: number | null
      cvs_used: number | null
      interviews_used: number | null
      compensation_used: number | null
      contracts_used: number | null
      ai_avatar_interviews_used: number | null
    }

    const typedSnapshots = (snapshots as unknown) as SnapshotRow[] | null

    // Transform snapshots to trend data
    const trends: UsageTrendData[] = (typedSnapshots || []).map((snapshot) => ({
      month: snapshot.snapshot_month,
      applications: snapshot.applications_used || 0,
      cvs: snapshot.cvs_used || 0,
      interviews: snapshot.interviews_used || 0,
      compensation: snapshot.compensation_used || 0,
      contracts: snapshot.contracts_used || 0,
      aiAvatarInterviews: snapshot.ai_avatar_interviews_used || 0,
    }))

    // Calculate averages
    const monthsTracked = trends.length
    const averages: Record<ResourceKey, number> = {
      applications: 0,
      cvs: 0,
      interviews: 0,
      compensation: 0,
      contracts: 0,
      aiAvatarInterviews: 0,
    }

    if (monthsTracked > 0) {
      const totals = trends.reduce(
        (acc, trend) => ({
          applications: acc.applications + trend.applications,
          cvs: acc.cvs + trend.cvs,
          interviews: acc.interviews + trend.interviews,
          compensation: acc.compensation + trend.compensation,
          contracts: acc.contracts + trend.contracts,
          aiAvatarInterviews: acc.aiAvatarInterviews + trend.aiAvatarInterviews,
        }),
        { applications: 0, cvs: 0, interviews: 0, compensation: 0, contracts: 0, aiAvatarInterviews: 0 }
      )

      averages.applications = totals.applications / monthsTracked
      averages.cvs = totals.cvs / monthsTracked
      averages.interviews = totals.interviews / monthsTracked
      averages.compensation = totals.compensation / monthsTracked
      averages.contracts = totals.contracts / monthsTracked
      averages.aiAvatarInterviews = totals.aiAvatarInterviews / monthsTracked
    }

    return NextResponse.json({
      trends,
      averages,
      monthsTracked,
    })
  } catch (error) {
    console.error('[Trends API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
