/**
 * Grow Payment Webhook Endpoint
 *
 * Handles payment notifications from Grow (Meshulam).
 * ALWAYS ACTIVE regardless of kill switch - payment processing must never be blocked.
 * Publicly accessible (no auth) - uses webhook key verification.
 *
 * @route POST /api/webhooks/grow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  verifyWebhook,
  parseWebhookPayload,
  approveTransaction,
} from '@/lib/subscription/grow-adapter'
import {
  getSubscription,
  activateSubscription,
  renewSubscription,
} from '@/lib/subscription/subscription-manager'
import {
  createOrFindCustomer,
  createInvoiceReceipt,
} from '@/lib/subscription/morning-adapter'
import { getPrice, TIER_CONFIGS } from '@/lib/subscription/config'

// ============================================================================
// Request Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse body - handle both form-encoded and JSON
    const body = await parseRequestBody(request)

    // 1. Verify webhook key
    if (!verifyWebhook(body)) {
      console.error('[Grow Webhook] Invalid webhook key')
      return NextResponse.json(
        { error: 'Invalid webhook key' },
        { status: 401 }
      )
    }

    // 2. Parse payload
    const payload = parseWebhookPayload(body)

    // Validate required fields
    if (!payload.userId) {
      console.error('[Grow Webhook] Missing userId in cField1')
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    if (!payload.tier || !payload.billingPeriod) {
      console.error('[Grow Webhook] Missing tier or billingPeriod')
      return NextResponse.json(
        { error: 'Missing tier or billingPeriod' },
        { status: 400 }
      )
    }

    // 3. Approve transaction with Grow (required!)
    const approvalResult = await approveTransaction({
      transactionId: payload.transactionId,
      transactionToken: payload.transactionToken,
    })

    if (!approvalResult.success) {
      console.error('[Grow Webhook] Failed to approve transaction:', approvalResult.error)
      return NextResponse.json(
        { error: 'Failed to approve transaction' },
        { status: 500 }
      )
    }

    // Get Supabase service client
    const supabase = createServiceClient()

    // 4. Determine first-time vs renewal
    // First-time if: no subscription OR tier is NULL (tracking-only row)
    const existingSub = await getSubscription(supabase, payload.userId)
    const isFirstTime = !existingSub || existingSub.tier === null

    // Build Grow payment data
    const growData = {
      transactionToken: payload.transactionToken,
      recurringId: payload.recurringId,
      transactionCode: payload.transactionCode,
    }

    // 5 & 6. Process subscription
    if (isFirstTime) {
      // FIRST-TIME: activate subscription
      await activateSubscription(
        supabase,
        payload.userId,
        payload.tier,
        payload.billingPeriod,
        growData
      )
      console.log(`[Grow Webhook] Activated subscription for user ${payload.userId}: ${payload.tier}/${payload.billingPeriod}`)
    } else {
      // RENEWAL: call renewSubscription
      // renewSubscription handles scheduled downgrades internally
      // renewSubscription handles double-reset prevention internally
      await renewSubscription(
        supabase,
        payload.userId,
        payload.transactionCode
      )
      console.log(`[Grow Webhook] Renewed subscription for user ${payload.userId}`)
    }

    // 7. Create Morning invoice (in try-catch — never fail webhook for invoicing)
    try {
      await createMorningInvoice(payload)
      console.log(`[Grow Webhook] Created invoice for user ${payload.userId}`)
    } catch (invoiceError) {
      // Log but don't fail the webhook
      console.error('[Grow Webhook] Failed to create invoice:', invoiceError)
    }

    // 8. Return 200 OK
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Grow Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse request body - handles both form-encoded and JSON
 */
async function parseRequestBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return await request.json()
  }

  // Handle form-encoded
  const formData = await request.formData()
  const body: Record<string, unknown> = {}

  formData.forEach((value, key) => {
    body[key] = value
  })

  return body
}

/**
 * Create invoice via Morning API
 */
async function createMorningInvoice(payload: ReturnType<typeof parseWebhookPayload>): Promise<void> {
  // Get customer name and email from payload
  const name = payload.name || 'Customer'
  const email = payload.email

  if (!email) {
    console.warn('[Grow Webhook] No email in payload, skipping invoice')
    return
  }

  // Create or find customer
  const customer = await createOrFindCustomer({ name, email })

  // Get price for invoice
  const price = getPrice(payload.tier, payload.billingPeriod)
  const tierName = TIER_CONFIGS[payload.tier].name

  // Create description
  const periodLabel = payload.billingPeriod === 'monthly' ? 'Monthly' :
    payload.billingPeriod === 'quarterly' ? 'Quarterly' : 'Annual'
  const description = `Signatura ${tierName} - ${periodLabel} Subscription`

  // Create invoice receipt
  await createInvoiceReceipt({
    customerId: customer.customerId,
    description,
    amount: price,
  })
}
