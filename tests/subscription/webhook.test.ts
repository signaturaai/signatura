/**
 * Grow Webhook Endpoint Tests (RALPH Loop 7)
 *
 * Tests for POST /api/webhooks/grow endpoint.
 * Verifies payment processing, subscription activation, and renewal flows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock modules before imports
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/subscription/grow-adapter', () => ({
  verifyWebhook: vi.fn(),
  parseWebhookPayload: vi.fn(),
  approveTransaction: vi.fn(),
}))

vi.mock('@/lib/subscription/subscription-manager', () => ({
  getSubscription: vi.fn(),
  activateSubscription: vi.fn(),
  renewSubscription: vi.fn(),
}))

vi.mock('@/lib/subscription/morning-adapter', () => ({
  createOrFindCustomer: vi.fn(),
  createInvoiceReceipt: vi.fn(),
}))

vi.mock('@/lib/subscription/config', () => ({
  getPrice: vi.fn(() => 12),
  TIER_CONFIGS: {
    momentum: { name: 'Momentum' },
    accelerate: { name: 'Accelerate' },
    elite: { name: 'Elite' },
  },
  isSubscriptionEnabled: vi.fn(),
}))

// Import after mocks
import { POST } from '@/app/api/webhooks/grow/route'
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
import { isSubscriptionEnabled } from '@/lib/subscription/config'

// ============================================================================
// Test Setup
// ============================================================================

describe('POST /api/webhooks/grow', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as never)
    vi.mocked(approveTransaction).mockResolvedValue({ success: true })
  })

  // Helper to create mock request
  function createMockRequest(
    body: Record<string, unknown>,
    contentType = 'application/json'
  ): NextRequest {
    const headers = new Headers({ 'content-type': contentType })

    if (contentType.includes('json')) {
      return new NextRequest('http://localhost/api/webhooks/grow', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    }

    // Form-encoded
    const formData = new URLSearchParams()
    for (const [key, value] of Object.entries(body)) {
      formData.append(key, String(value))
    }

    return new NextRequest('http://localhost/api/webhooks/grow', {
      method: 'POST',
      headers: new Headers({ 'content-type': 'application/x-www-form-urlencoded' }),
      body: formData.toString(),
    })
  }

  // Helper for standard webhook payload
  function createStandardPayload() {
    return {
      webhookKey: 'valid-key',
      cField1: 'user-123',
      cField2: 'accelerate',
      cField3: 'monthly',
      transactionId: 'txn-123',
      transactionToken: 'token-123',
      transactionCode: 'code-123',
      recurringId: 'rec-123',
      fullName: 'Test User',
      email: 'test@example.com',
    }
  }

  // ==========================================================================
  // Webhook Key Verification
  // ==========================================================================

  describe('Webhook Key Verification', () => {
    it('POST /api/webhooks/grow rejects invalid webhook key → 401', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(false)

      const request = createMockRequest({ webhookKey: 'wrong' })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid webhook key')
    })
  })

  // ==========================================================================
  // First-Time Payment (Activation)
  // ==========================================================================

  describe('First-Time Payment Flow', () => {
    it('POST /api/webhooks/grow handles first-time payment (tier=NULL → activate)', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-123',
        tier: 'accelerate',
        billingPeriod: 'monthly',
        transactionId: 'txn-123',
        transactionToken: 'token-123',
        transactionCode: 'code-123',
        recurringId: 'rec-123',
        name: 'Test User',
        email: 'test@example.com',
        sum: '18',
      })

      // User with tier=NULL (tracking-only)
      vi.mocked(getSubscription).mockResolvedValue({ tier: null } as never)
      vi.mocked(activateSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-123',
        isNew: false,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-123',
        documentUrl: 'http://example.com/doc',
      })

      const request = createMockRequest(createStandardPayload())
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify activateSubscription called with correct params
      expect(activateSubscription).toHaveBeenCalledWith(
        mockSupabase,
        'user-123',
        'accelerate',
        'monthly',
        expect.objectContaining({
          transactionToken: 'token-123',
          recurringId: 'rec-123',
          transactionCode: 'code-123',
        })
      )

      // Verify approveTransaction called
      expect(approveTransaction).toHaveBeenCalledWith({
        transactionId: 'txn-123',
        transactionToken: 'token-123',
      })

      // Verify Morning invoice created (in try-catch)
      expect(createOrFindCustomer).toHaveBeenCalled()
      expect(createInvoiceReceipt).toHaveBeenCalled()
    })

    it('handles first-time payment when no subscription exists', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'new-user',
        tier: 'momentum',
        billingPeriod: 'yearly',
        transactionId: 'txn-new',
        transactionToken: 'token-new',
        transactionCode: 'code-new',
        recurringId: 'rec-new',
        name: 'New User',
        email: 'new@example.com',
        sum: '99',
      })

      // No subscription exists
      vi.mocked(getSubscription).mockResolvedValue(null as never)
      vi.mocked(activateSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-new',
        isNew: true,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-new',
        documentUrl: 'http://example.com/doc-new',
      })

      const request = createMockRequest({
        webhookKey: 'valid',
        cField1: 'new-user',
        cField2: 'momentum',
        cField3: 'yearly',
        transactionId: 'txn-new',
        transactionToken: 'token-new',
        transactionCode: 'code-new',
        recurringId: 'rec-new',
        fullName: 'New User',
        email: 'new@example.com',
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(activateSubscription).toHaveBeenCalledWith(
        mockSupabase,
        'new-user',
        'momentum',
        'yearly',
        expect.any(Object)
      )
    })
  })

  // ==========================================================================
  // Renewal Payment
  // ==========================================================================

  describe('Renewal Payment Flow', () => {
    it('POST /api/webhooks/grow handles renewal payment', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-existing',
        tier: 'accelerate',
        billingPeriod: 'monthly',
        transactionId: 'txn-renew',
        transactionToken: 'token-renew',
        transactionCode: 'code-renew',
        recurringId: 'rec-renew',
        name: 'Existing User',
        email: 'existing@example.com',
        sum: '18',
      })

      // Existing subscription (not NULL, no pending)
      vi.mocked(getSubscription).mockResolvedValue({
        tier: 'accelerate',
        billingPeriod: 'monthly',
        scheduledTierChange: null,
      } as never)
      vi.mocked(renewSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-existing',
        isNew: false,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-renew',
        documentUrl: 'http://example.com/doc-renew',
      })

      const request = createMockRequest({
        webhookKey: 'valid',
        cField1: 'user-existing',
        cField2: 'accelerate',
        cField3: 'monthly',
        transactionId: 'txn-renew',
        transactionToken: 'token-renew',
        transactionCode: 'code-renew',
        recurringId: 'rec-renew',
        fullName: 'Existing User',
        email: 'existing@example.com',
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify renewSubscription called (not activateSubscription)
      expect(renewSubscription).toHaveBeenCalledWith(
        mockSupabase,
        'user-existing',
        'code-renew'
      )
      expect(activateSubscription).not.toHaveBeenCalled()
    })

    it('POST /api/webhooks/grow applies scheduled downgrade during renewal', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-downgrade',
        tier: 'momentum', // downgrading to momentum
        billingPeriod: 'monthly',
        transactionId: 'txn-dg',
        transactionToken: 'token-dg',
        transactionCode: 'code-dg',
        recurringId: 'rec-dg',
        name: 'Downgrade User',
        email: 'downgrade@example.com',
        sum: '12',
      })

      // User with scheduled downgrade
      vi.mocked(getSubscription).mockResolvedValue({
        tier: 'elite', // currently elite
        billingPeriod: 'monthly',
        scheduledTierChange: 'momentum', // scheduled to downgrade
      } as never)
      vi.mocked(renewSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-dg',
        isNew: false,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-dg',
        documentUrl: 'http://example.com/doc-dg',
      })

      const request = createMockRequest({
        webhookKey: 'valid',
        cField1: 'user-downgrade',
        cField2: 'momentum',
        cField3: 'monthly',
        transactionId: 'txn-dg',
        transactionToken: 'token-dg',
        transactionCode: 'code-dg',
        recurringId: 'rec-dg',
        fullName: 'Downgrade User',
        email: 'downgrade@example.com',
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // renewSubscription handles scheduled downgrade internally
      expect(renewSubscription).toHaveBeenCalledWith(
        mockSupabase,
        'user-downgrade',
        'code-dg'
      )
    })
  })

  // ==========================================================================
  // Body Parsing (Form-encoded AND JSON)
  // ==========================================================================

  describe('Body Parsing', () => {
    it('POST /api/webhooks/grow handles form-encoded bodies', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-form',
        tier: 'momentum',
        billingPeriod: 'monthly',
        transactionId: 'txn-form',
        transactionToken: 'token-form',
        transactionCode: 'code-form',
        recurringId: 'rec-form',
        name: 'Form User',
        email: 'form@example.com',
        sum: '12',
      })
      vi.mocked(getSubscription).mockResolvedValue(null as never)
      vi.mocked(activateSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-form',
        isNew: true,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-form',
        documentUrl: 'http://example.com/doc-form',
      })

      // Create form-encoded request
      const request = createMockRequest(
        {
          webhookKey: 'valid',
          cField1: 'user-form',
          cField2: 'momentum',
          cField3: 'monthly',
          transactionId: 'txn-form',
          transactionToken: 'token-form',
          transactionCode: 'code-form',
          recurringId: 'rec-form',
          fullName: 'Form User',
          email: 'form@example.com',
        },
        'application/x-www-form-urlencoded'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(verifyWebhook).toHaveBeenCalled()
    })

    it('POST /api/webhooks/grow handles JSON bodies', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-json',
        tier: 'accelerate',
        billingPeriod: 'yearly',
        transactionId: 'txn-json',
        transactionToken: 'token-json',
        transactionCode: 'code-json',
        recurringId: 'rec-json',
        name: 'JSON User',
        email: 'json@example.com',
        sum: '149',
      })
      vi.mocked(getSubscription).mockResolvedValue(null as never)
      vi.mocked(activateSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-json',
        isNew: true,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-json',
        documentUrl: 'http://example.com/doc-json',
      })

      // Create JSON request
      const request = createMockRequest(
        {
          webhookKey: 'valid',
          cField1: 'user-json',
          cField2: 'accelerate',
          cField3: 'yearly',
          transactionId: 'txn-json',
          transactionToken: 'token-json',
          transactionCode: 'code-json',
          recurringId: 'rec-json',
          fullName: 'JSON User',
          email: 'json@example.com',
        },
        'application/json'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(verifyWebhook).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Morning Invoice Error Handling
  // ==========================================================================

  describe('Morning Invoice Error Handling', () => {
    it('POST /api/webhooks/grow does NOT fail if Morning invoicing errors', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-invoice-error',
        tier: 'momentum',
        billingPeriod: 'monthly',
        transactionId: 'txn-inv-err',
        transactionToken: 'token-inv-err',
        transactionCode: 'code-inv-err',
        recurringId: 'rec-inv-err',
        name: 'Invoice Error User',
        email: 'invoice-error@example.com',
        sum: '12',
      })
      vi.mocked(getSubscription).mockResolvedValue(null as never)
      vi.mocked(activateSubscription).mockResolvedValue({} as never)

      // Morning API throws error
      vi.mocked(createOrFindCustomer).mockRejectedValue(
        new Error('Morning API unavailable')
      )

      const request = createMockRequest({
        webhookKey: 'valid',
        cField1: 'user-invoice-error',
        cField2: 'momentum',
        cField3: 'monthly',
        transactionId: 'txn-inv-err',
        transactionToken: 'token-inv-err',
        transactionCode: 'code-inv-err',
        recurringId: 'rec-inv-err',
        fullName: 'Invoice Error User',
        email: 'invoice-error@example.com',
      })

      const response = await POST(request)

      // Webhook should still return 200
      expect(response.status).toBe(200)

      // Subscription should still be activated
      expect(activateSubscription).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Kill Switch Independence
  // ==========================================================================

  describe('Kill Switch Independence', () => {
    it('POST /api/webhooks/grow is active when kill switch is OFF', async () => {
      vi.mocked(isSubscriptionEnabled).mockReturnValue(false)
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-ks-off',
        tier: 'momentum',
        billingPeriod: 'monthly',
        transactionId: 'txn-ks-off',
        transactionToken: 'token-ks-off',
        transactionCode: 'code-ks-off',
        recurringId: 'rec-ks-off',
        name: 'KS Off User',
        email: 'ks-off@example.com',
        sum: '12',
      })
      vi.mocked(getSubscription).mockResolvedValue(null as never)
      vi.mocked(activateSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-ks-off',
        isNew: true,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-ks-off',
        documentUrl: 'http://example.com/doc-ks-off',
      })

      const request = createMockRequest({
        webhookKey: 'valid',
        cField1: 'user-ks-off',
        cField2: 'momentum',
        cField3: 'monthly',
        transactionId: 'txn-ks-off',
        transactionToken: 'token-ks-off',
        transactionCode: 'code-ks-off',
        recurringId: 'rec-ks-off',
        fullName: 'KS Off User',
        email: 'ks-off@example.com',
      })

      const response = await POST(request)

      // Still processes payment even when kill switch is off
      expect(response.status).toBe(200)
      expect(activateSubscription).toHaveBeenCalled()
    })

    it('POST /api/webhooks/grow is active when kill switch is ON', async () => {
      vi.mocked(isSubscriptionEnabled).mockReturnValue(true)
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-ks-on',
        tier: 'elite',
        billingPeriod: 'yearly',
        transactionId: 'txn-ks-on',
        transactionToken: 'token-ks-on',
        transactionCode: 'code-ks-on',
        recurringId: 'rec-ks-on',
        name: 'KS On User',
        email: 'ks-on@example.com',
        sum: '249',
      })
      vi.mocked(getSubscription).mockResolvedValue(null as never)
      vi.mocked(activateSubscription).mockResolvedValue({} as never)
      vi.mocked(createOrFindCustomer).mockResolvedValue({
        customerId: 'cust-ks-on',
        isNew: true,
      })
      vi.mocked(createInvoiceReceipt).mockResolvedValue({
        documentId: 'doc-ks-on',
        documentUrl: 'http://example.com/doc-ks-on',
      })

      const request = createMockRequest({
        webhookKey: 'valid',
        cField1: 'user-ks-on',
        cField2: 'elite',
        cField3: 'yearly',
        transactionId: 'txn-ks-on',
        transactionToken: 'token-ks-on',
        transactionCode: 'code-ks-on',
        recurringId: 'rec-ks-on',
        fullName: 'KS On User',
        email: 'ks-on@example.com',
      })

      const response = await POST(request)

      // Still processes payment when kill switch is on
      expect(response.status).toBe(200)
      expect(activateSubscription).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('returns 400 when userId is missing', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: '', // empty
        tier: 'momentum',
        billingPeriod: 'monthly',
        transactionId: 'txn',
        transactionToken: 'token',
        transactionCode: 'code',
        recurringId: 'rec',
        name: 'User',
        email: 'user@example.com',
        sum: '12',
      })

      const request = createMockRequest({
        webhookKey: 'valid',
        cField2: 'momentum',
        cField3: 'monthly',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing userId')
    })

    it('returns 400 when tier is missing', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-123',
        tier: null as never,
        billingPeriod: 'monthly',
        transactionId: 'txn',
        transactionToken: 'token',
        transactionCode: 'code',
        recurringId: 'rec',
        name: 'User',
        email: 'user@example.com',
        sum: '12',
      })

      const request = createMockRequest({
        webhookKey: 'valid',
        cField1: 'user-123',
        cField3: 'monthly',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing tier or billingPeriod')
    })

    it('returns 500 when transaction approval fails', async () => {
      vi.mocked(verifyWebhook).mockReturnValue(true)
      vi.mocked(parseWebhookPayload).mockReturnValue({
        userId: 'user-123',
        tier: 'momentum',
        billingPeriod: 'monthly',
        transactionId: 'txn',
        transactionToken: 'token',
        transactionCode: 'code',
        recurringId: 'rec',
        name: 'User',
        email: 'user@example.com',
        sum: '12',
      })
      vi.mocked(approveTransaction).mockResolvedValue({
        success: false,
        error: 'Approval failed',
      })

      const request = createMockRequest(createStandardPayload())
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to approve transaction')
    })
  })
})
