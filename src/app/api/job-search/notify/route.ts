/**
 * Email Notification API
 *
 * POST /api/job-search/notify - Triggers email digest notifications
 *
 * This endpoint is designed to be called by a cron job.
 * Requires CRON_SECRET header for authentication.
 *
 * Body: { frequency: 'daily' | 'weekly' | 'monthly' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendBatchDigests } from '@/lib/job-search'
import type { EmailNotificationFrequency } from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface NotifyResponse {
  success: boolean
  sent?: number
  failed?: number
  error?: string
}

// ============================================================================
// Validation Schema
// ============================================================================

const NotifyRequestSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
})

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<NotifyResponse>> {
  try {
    // 1. Validate CRON_SECRET header
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

    if (!cronSecret) {
      return NextResponse.json({ success: false, error: 'Missing authorization' }, { status: 401 })
    }

    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret) {
      console.error('[Notify] CRON_SECRET not configured')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    if (cronSecret !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Invalid authorization' }, { status: 403 })
    }

    // 2. Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = NotifyRequestSchema.safeParse(body)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ success: false, error: `Validation error: ${errors}` }, { status: 400 })
    }

    const { frequency } = parseResult.data as { frequency: EmailNotificationFrequency }

    // 3. Send batch digests
    console.log(`[Notify] Starting ${frequency} batch digest`)

    const result = await sendBatchDigests(frequency)

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Failed to send digests' }, { status: 500 })
    }

    console.log(`[Notify] Completed ${frequency} batch: sent=${result.sent}, failed=${result.failed}`)

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (error) {
    console.error('[Notify] Error in POST:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
