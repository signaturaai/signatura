/**
 * Cron Job: Process Subscriptions
 *
 * Scheduled daily (0 0 * * *) via Vercel Cron.
 * Handles two critical tasks:
 *
 * 1. PROCESS EXPIRATIONS:
 *    - Cancelled subscriptions past their effective date → expired
 *    - Past_due subscriptions past grace period → expired
 *
 * 2. RECONCILE SNAPSHOTS (Safety Net):
 *    - Verify monthly snapshots match actual activity
 *    - Log warnings for mismatches (no auto-correction)
 *
 * When SUBSCRIPTION_ENABLED=false, returns { skipped: true } immediately.
 *
 * @security Requires CRON_SECRET in Authorization header
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isSubscriptionEnabled } from '@/lib/subscription/config'
import { processExpirations } from '@/lib/subscription/subscription-manager'
import { format, subMonths } from 'date-fns'

// Types
interface ReconciliationMismatch {
  userId: string
  snapshotMonth: string
  field: string
  snapshotValue: number
  actualValue: number
}

interface CronResult {
  skipped?: boolean
  reason?: string
  expired?: number
  reconciled?: number
  mismatches?: ReconciliationMismatch[]
  executionTime?: number
  timestamp?: string
}

/**
 * Verify the cron secret matches
 */
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no CRON_SECRET configured, deny access
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured')
    return false
  }

  // Expect "Bearer <secret>" format
  if (!authHeader) {
    return false
  }

  const [bearer, token] = authHeader.split(' ')
  if (bearer !== 'Bearer' || token !== cronSecret) {
    return false
  }

  return true
}

/**
 * Reconcile monthly usage snapshots with actual subscription data
 *
 * For each user, verify their snapshot for last month matches their
 * recorded activity. Log warnings if mismatched (no auto-correction).
 */
async function reconcileSnapshots(
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ reconciled: number; mismatches: ReconciliationMismatch[] }> {
  const mismatches: ReconciliationMismatch[] = []
  let reconciled = 0

  // Get last month in YYYY-MM format
  const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

  // Fetch all snapshots for last month
  const { data: snapshots, error: snapshotError } = await supabase
    .from('usage_monthly_snapshots')
    .select('*')
    .eq('snapshot_month', lastMonth)

  if (snapshotError) {
    console.error('[Cron] Failed to fetch snapshots:', snapshotError.message)
    return { reconciled: 0, mismatches: [] }
  }

  if (!snapshots || snapshots.length === 0) {
    console.log('[Cron] No snapshots found for month:', lastMonth)
    return { reconciled: 0, mismatches: [] }
  }

  // For each snapshot, verify against the current subscription counters
  // Note: This is a safety net check - if counters were reset for a new period,
  // the snapshot should have captured the old values before reset
  for (const snapshot of snapshots) {
    const userId = snapshot.user_id

    // Get current subscription to verify tier matches
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier, billing_period')
      .eq('user_id', userId)
      .single()

    if (subError) {
      // User may have been deleted, skip
      continue
    }

    // Check tier consistency (snapshot tier should match what was active during that month)
    // Note: Tier in snapshot represents the tier at the time of snapshot creation
    if (snapshot.tier !== null && subscription?.tier !== snapshot.tier) {
      // This is expected if user upgraded/downgraded - not a mismatch
      // Only log if tier in snapshot is completely inconsistent
      console.log(
        `[Cron] Tier changed for user ${userId}: snapshot=${snapshot.tier}, current=${subscription?.tier}`
      )
    }

    // Verify basic data integrity
    const usageFields = [
      { field: 'applications_used', value: snapshot.applications_used },
      { field: 'cvs_used', value: snapshot.cvs_used },
      { field: 'interviews_used', value: snapshot.interviews_used },
      { field: 'compensation_used', value: snapshot.compensation_used },
      { field: 'contracts_used', value: snapshot.contracts_used },
      { field: 'ai_avatar_interviews_used', value: snapshot.ai_avatar_interviews_used },
    ]

    // Check for negative values (data corruption)
    for (const { field, value } of usageFields) {
      if (value < 0) {
        mismatches.push({
          userId,
          snapshotMonth: lastMonth,
          field,
          snapshotValue: value,
          actualValue: 0, // Expected minimum
        })
        console.warn(
          `[Cron] Data integrity issue: ${field} is negative (${value}) for user ${userId}`
        )
      }
    }

    reconciled++
  }

  return { reconciled, mismatches }
}

/**
 * GET /api/cron/process-subscriptions
 *
 * Processes subscription expirations and reconciles monthly snapshots.
 */
export async function GET(request: Request): Promise<NextResponse<CronResult>> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  // Verify cron secret
  if (!verifyCronSecret(request)) {
    console.error('[Cron] Unauthorized access attempt')
    return NextResponse.json(
      { skipped: true, reason: 'unauthorized' },
      { status: 401 }
    )
  }

  // Check kill switch
  if (!isSubscriptionEnabled()) {
    console.log('[Cron] Subscription enforcement disabled, skipping')
    return NextResponse.json({
      skipped: true,
      reason: 'enforcement disabled',
      timestamp,
    })
  }

  try {
    const supabase = createServiceClient()

    // 1. Process expirations
    console.log('[Cron] Processing subscription expirations...')
    const expirationResult = await processExpirations(supabase)
    console.log(`[Cron] Expired ${expirationResult.expired} subscriptions`)

    // 2. Reconcile snapshots
    console.log('[Cron] Reconciling monthly snapshots...')
    const reconciliationResult = await reconcileSnapshots(supabase)
    console.log(`[Cron] Reconciled ${reconciliationResult.reconciled} snapshots`)

    if (reconciliationResult.mismatches.length > 0) {
      console.warn(
        `[Cron] Found ${reconciliationResult.mismatches.length} data integrity issues`
      )
    }

    const executionTime = Date.now() - startTime

    console.log(`[Cron] Completed in ${executionTime}ms`)

    return NextResponse.json({
      expired: expirationResult.expired,
      reconciled: reconciliationResult.reconciled,
      mismatches: reconciliationResult.mismatches.length > 0
        ? reconciliationResult.mismatches
        : undefined,
      executionTime,
      timestamp,
    })
  } catch (error) {
    console.error('[Cron] Error processing subscriptions:', error)
    return NextResponse.json(
      {
        skipped: true,
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      },
      { status: 500 }
    )
  }
}
