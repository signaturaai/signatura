/**
 * Grow (Meshulam) Payment Gateway Adapter
 *
 * Server-only module for interacting with the Grow payment gateway.
 * Grow uses form-encoded POST (application/x-www-form-urlencoded), NOT JSON.
 *
 * @module grow-adapter
 * @server-only
 */

import { getPrice } from './config'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

// ============================================================================
// Types
// ============================================================================

export interface GrowWebhookPayload {
  transactionId: string
  transactionToken: string
  transactionCode: string
  status: string
  sum: number
  currency: string
  userId: string
  tier: SubscriptionTier
  billingPeriod: BillingPeriod
  recurringId?: string
  email?: string
  name?: string
  rawPayload: Record<string, unknown>
}

export interface CreateRecurringPaymentParams {
  tier: SubscriptionTier
  billingPeriod: BillingPeriod
  userId: string
  email?: string
  name?: string
  notifyUrl: string
  successUrl: string
  cancelUrl: string
}

export interface CreateRecurringPaymentResult {
  success: boolean
  paymentUrl?: string
  error?: string
}

export interface CreateOneTimeChargeParams {
  amount: number
  description: string
  userId: string
  transactionToken: string
}

export interface CreateOneTimeChargeResult {
  success: boolean
  transactionId?: string
  error?: string
}

export interface ApproveTransactionParams {
  transactionId: string
  transactionToken: string
}

export interface ApproveTransactionResult {
  success: boolean
  error?: string
}

// ============================================================================
// Configuration
// ============================================================================

function getGrowConfig() {
  const apiUrl = process.env.GROW_API_URL
  const userId = process.env.GROW_USER_ID

  if (!apiUrl) {
    throw new Error('GROW_API_URL environment variable is not set')
  }

  if (!userId) {
    throw new Error('GROW_USER_ID environment variable is not set')
  }

  return { apiUrl, userId }
}

function getPageCode(tier: SubscriptionTier, billingPeriod: BillingPeriod): string {
  const envVarName = `GROW_PAGE_CODE_${tier.toUpperCase()}_${billingPeriod.toUpperCase()}`
  const pageCode = process.env[envVarName]

  if (!pageCode) {
    throw new Error(`${envVarName} environment variable is not set`)
  }

  return pageCode
}

// ============================================================================
// Core API Function
// ============================================================================

/**
 * Make a form-encoded POST request to the Grow API
 *
 * @param endpoint - API endpoint path (e.g., '/createPaymentProcess')
 * @param formFields - Key-value pairs to send as form data
 * @returns Parsed JSON response
 */
export async function growApiCall(
  endpoint: string,
  formFields: Record<string, string>
): Promise<Record<string, unknown>> {
  const { apiUrl, userId } = getGrowConfig()

  // Add userId to all requests
  const fields = {
    ...formFields,
    userId,
  }

  // Convert to URL-encoded form data
  const formBody = new URLSearchParams(fields).toString()

  const url = `${apiUrl}${endpoint}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  })

  if (!response.ok) {
    throw new Error(`Grow API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

// ============================================================================
// Payment Functions
// ============================================================================

/**
 * Create a recurring payment (subscription) via Grow
 *
 * @param params - Payment parameters including tier, period, user info, and URLs
 * @returns Success status and payment URL for redirect
 */
export async function createRecurringPayment(
  params: CreateRecurringPaymentParams
): Promise<CreateRecurringPaymentResult> {
  const { tier, billingPeriod, userId, email, name, notifyUrl, successUrl, cancelUrl } = params

  try {
    const pageCode = getPageCode(tier, billingPeriod)
    const price = getPrice(tier, billingPeriod)

    const formFields: Record<string, string> = {
      pageCode,
      sum: price.toString(),
      paymentNum: '0', // Recurring payment indicator
      cField1: userId,
      cField2: tier,
      cField3: billingPeriod,
      notifyUrl,
      successUrl,
      cancelUrl,
    }

    // Add optional fields
    if (email) {
      formFields.email = email
    }
    if (name) {
      formFields.fullName = name
    }

    const response = await growApiCall('/createPaymentProcess', formFields)

    if (response.status === 1 && response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>
      return {
        success: true,
        paymentUrl: data.url as string,
      }
    }

    return {
      success: false,
      error: (response.err as Record<string, unknown>)?.message as string || 'Unknown error creating payment',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a one-time charge against a stored card token
 * Used for prorated upgrade charges
 *
 * @param params - Charge parameters including amount and token
 * @returns Success status
 */
export async function createOneTimeCharge(
  params: CreateOneTimeChargeParams
): Promise<CreateOneTimeChargeResult> {
  const { amount, description, userId, transactionToken } = params

  try {
    const formFields: Record<string, string> = {
      transactionToken,
      sum: amount.toString(),
      description,
      cField1: userId,
    }

    const response = await growApiCall('/chargeToken', formFields)

    if (response.status === 1) {
      const data = response.data as Record<string, unknown> | undefined
      return {
        success: true,
        transactionId: data?.transactionId as string,
      }
    }

    return {
      success: false,
      error: (response.err as Record<string, unknown>)?.message as string || 'Unknown error charging token',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Approve a pending transaction
 *
 * @param params - Transaction ID and token
 * @returns Success status
 */
export async function approveTransaction(
  params: ApproveTransactionParams
): Promise<ApproveTransactionResult> {
  const { transactionId, transactionToken } = params

  try {
    const formFields: Record<string, string> = {
      transactionId,
      transactionToken,
    }

    const response = await growApiCall('/approveTransaction', formFields)

    if (response.status === 1) {
      return { success: true }
    }

    return {
      success: false,
      error: (response.err as Record<string, unknown>)?.message as string || 'Unknown error approving transaction',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Webhook Functions
// ============================================================================

/**
 * Parse a Grow webhook payload into a typed object
 *
 * @param body - Raw webhook body from Grow
 * @returns Parsed webhook payload with extracted custom fields
 */
export function parseWebhookPayload(body: Record<string, unknown>): GrowWebhookPayload {
  // Extract custom fields we set during payment creation
  const userId = (body.cField1 as string) || ''
  const tier = (body.cField2 as SubscriptionTier) || 'momentum'
  const billingPeriod = (body.cField3 as BillingPeriod) || 'monthly'

  return {
    transactionId: (body.transactionId as string) || '',
    transactionToken: (body.transactionToken as string) || '',
    transactionCode: (body.transactionCode as string) || '',
    status: (body.status as string) || '',
    sum: parseFloat(body.sum as string) || 0,
    currency: (body.currency as string) || 'ILS',
    userId,
    tier,
    billingPeriod,
    recurringId: body.recurringId as string | undefined,
    email: body.email as string | undefined,
    name: body.fullName as string | undefined,
    rawPayload: body,
  }
}

/**
 * Verify a webhook signature from Grow
 *
 * @param body - Raw webhook body containing webhookKey
 * @returns True if the webhook is authentic
 */
export function verifyWebhook(body: Record<string, unknown>): boolean {
  const expectedKey = process.env.GROW_WEBHOOK_KEY

  if (!expectedKey) {
    // If no webhook key is configured, reject all webhooks
    console.warn('GROW_WEBHOOK_KEY is not set - rejecting webhook')
    return false
  }

  const receivedKey = body.webhookKey as string

  if (!receivedKey) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  if (expectedKey.length !== receivedKey.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < expectedKey.length; i++) {
    result |= expectedKey.charCodeAt(i) ^ receivedKey.charCodeAt(i)
  }

  return result === 0
}
