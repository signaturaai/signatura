/**
 * GDPR Account Deletion API (Right to Erasure)
 *
 * POST /api/gdpr/delete-account - Request account deletion (30-day grace period)
 * DELETE /api/gdpr/delete-account - Cancel pending deletion request
 * GET /api/gdpr/delete-account - Check deletion request status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GRACE_PERIOD_DAYS = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { confirm, reason } = body

    // Require explicit confirmation
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        {
          error: 'Confirmation required. Please send confirm: "DELETE_MY_ACCOUNT"',
        },
        { status: 400 }
      )
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json(
        {
          error: 'A deletion request is already pending',
          existing_request: {
            id: existingRequest.id,
            scheduled_date: existingRequest.scheduled_deletion_date,
            requested_at: existingRequest.requested_at,
          },
        },
        { status: 409 }
      )
    }

    // Calculate scheduled deletion date (30 days from now)
    const scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + GRACE_PERIOD_DAYS)

    // Create deletion request
    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        scheduled_deletion_date: scheduledDate.toISOString(),
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating deletion request:', insertError)
      throw insertError
    }

    // Log this action
    await supabase.from('consent_log').insert({
      user_id: user.id,
      consent_type: 'data_processing',
      action: 'revoked',
      version: 'account_deletion_requested',
    })

    return NextResponse.json({
      success: true,
      message: 'Account deletion scheduled',
      deletion_request: {
        id: deletionRequest.id,
        scheduled_date: scheduledDate.toISOString(),
        grace_period_days: GRACE_PERIOD_DAYS,
        can_cancel_until: scheduledDate.toISOString(),
      },
      important_notice:
        'Your account and all data will be permanently deleted after the grace period. You can cancel this request anytime before the scheduled date.',
    })
  } catch (error) {
    console.error('Error requesting account deletion:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request deletion' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find pending deletion request
    const { data: pendingRequest } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (!pendingRequest) {
      return NextResponse.json(
        { error: 'No pending deletion request found' },
        { status: 404 }
      )
    }

    // Cancel the request
    const { error: updateError } = await supabase
      .from('account_deletion_requests')
      .update({ status: 'cancelled' })
      .eq('id', pendingRequest.id)

    if (updateError) {
      throw updateError
    }

    // Log this action
    await supabase.from('consent_log').insert({
      user_id: user.id,
      consent_type: 'data_processing',
      action: 'granted',
      version: 'account_deletion_cancelled',
    })

    return NextResponse.json({
      success: true,
      message: 'Account deletion request cancelled',
      cancelled_request_id: pendingRequest.id,
    })
  } catch (error) {
    console.error('Error cancelling account deletion:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel deletion' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all deletion requests for user
    const { data: requests, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw fetchError
    }

    const pendingRequest = requests?.find((r) => r.status === 'pending')

    return NextResponse.json({
      success: true,
      has_pending_request: !!pendingRequest,
      pending_request: pendingRequest
        ? {
            id: pendingRequest.id,
            scheduled_date: pendingRequest.scheduled_deletion_date,
            requested_at: pendingRequest.requested_at,
            days_remaining: Math.ceil(
              (new Date(pendingRequest.scheduled_deletion_date).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            ),
          }
        : null,
      all_requests: requests || [],
    })
  } catch (error) {
    console.error('Error fetching deletion status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
