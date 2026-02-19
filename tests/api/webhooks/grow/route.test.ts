/**
 * Grow Webhook Endpoint Tests (Phase 8.1)
 *
 * RALPH tests for the Grow payment webhook handler.
 * Tests webhook verification, subscription activation/renewal, and invoice creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Mocks
// ============================================================================

const mockVerifyWebhook = vi.fn()
const mockParseWebhookPayload = vi.fn()
const mockApproveTransaction = vi.fn()
const mockGetSubscription = vi.fn()
const mockActivateSubscription = vi.fn()
const mockRenewSubscription = vi.fn()
const mockCreateOrFindCustomer = vi.fn()
const mockCreateInvoiceReceipt = vi.fn()
const mockCreateServiceClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockCreateServiceClient(),
}))

vi.mock('@/lib/subscription/grow-adapter', () => ({
  verifyWebhook: (body: unknown) => mockVerifyWebhook(body),
  parseWebhookPayload: (body: unknown) => mockParseWebhookPayload(body),
  approveTransaction: (params: unknown) => mockApproveTransaction(params),
}))

vi.mock('@/lib/subscription/subscription-manager', () => ({
  getSubscription: (supabase: unknown, userId: string) => mockGetSubscription(supabase, userId),
  activateSubscription: (supabase: unknown, userId: string, tier: string, period: string, data: unknown) =>
    mockActivateSubscription(supabase, userId, tier, period, data),
  renewSubscription: (supabase: unknown, userId: string, code: string) =>
    mockRenewSubscription(supabase, userId, code),
}))

vi.mock('@/lib/subscription/morning-adapter', () => ({
  createOrFindCustomer: (params: unknown) => mockCreateOrFindCustomer(params),
  createInvoiceReceipt: (params: unknown) => mockCreateInvoiceReceipt(params),
}))

vi.mock('@/lib/subscription/config', () => ({
  getPrice: (tier: string, period: string) => {
    const prices: Record<string, Record<string, number>> = {
      momentum: { monthly: 12, quarterly: 30, yearly: 99 },
      accelerate: { monthly: 18, quarterly: 45, yearly: 149 },
      elite: { monthly: 29, quarterly: 75, yearly: 249 },
    }
    return prices[tier]?.[period] || 0
  },
  TIER_CONFIGS: {
    momentum: { name: 'Momentum' },
    accelerate: { name: 'Accelerate' },
    elite: { name: 'Elite' },
  },
}))

// Import after mocks
import { POST } from '@/app/api/webhooks/grow/route'

// ============================================================================
// Test Helpers
// ============================================================================

function createMockPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    transactionId: 'txn-123',
    transactionToken: 'token-abc',
    transactionCode: 'code-xyz',
    status: 'success',
    sum: 12,
    currency: 'USD',
    userId: 'user-123',
    tier: 'momentum',
    billingPeriod: 'monthly',
    recurringId: 'rec-456',
    email: 'test@example.com',
    name: 'Test User',
    rawPayload: {},
    ...overrides,
  }
}

function createJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/grow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createFormRequest(body: Record<string, string>): NextRequest {
  const formData = new URLSearchParams(body)
  return new NextRequest('http://localhost/api/webhooks/grow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  })
}

// ============================================================================
// Tests
// ============================================================================

describe('Grow Webhook Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockCreateServiceClient.mockReturnValue({})
    mockVerifyWebhook.mockReturnValue(true)
    mockParseWebhookPayload.mockReturnValue(createMockPayload())
    mockApproveTransaction.mockResolvedValue({ success: true })
    mockGetSubscription.mockResolvedValue(null)
    mockActivateSubscription.mockResolvedValue(undefined)
    mockRenewSubscription.mockResolvedValue(undefined)
    mockCreateOrFindCustomer.mockResolvedValue({ customerId: 'cust-123', isNew: false })
    mockCreateInvoiceReceipt.mockResolvedValue({ documentId: 'doc-123', documentUrl: 'https://example.com/doc' })
  })

  // ==========================================================================
  // Request Body Parsing
  // ==========================================================================

  describe('Request Body Parsing', () => {
    it('should handle JSON body', async () => {
      const body = { webhookKey: 'test-key', cField1: 'user-123' }
      const request = createJsonRequest(body)

      await POST(request)

      expect(mockVerifyWebhook).toHaveBeenCalledWith(body)
    })

    it('should handle form-encoded body', async () => {
      const body = { webhookKey: 'test-key', cField1: 'user-123' }
      const request = createFormRequest(body)

      await POST(request)

      expect(mockVerifyWebhook).toHaveBeenCalled()
      const calledWith = mockVerifyWebhook.mock.calls[0][0]
      expect(calledWith.webhookKey).toBe('test-key')
      expect(calledWith.cField1).toBe('user-123')
    })
  })

  // ==========================================================================
  // Webhook Verification
  // ==========================================================================

  describe('Webhook Verification', () => {
    it('should return 401 if webhook key is invalid', async () => {
      mockVerifyWebhook.mockReturnValue(false)
      const request = createJsonRequest({ webhookKey: 'invalid' })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid webhook key')
    })

    it('should continue if webhook key is valid', async () => {
      mockVerifyWebhook.mockReturnValue(true)
      const request = createJsonRequest({ webhookKey: 'valid' })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Payload Validation
  // ==========================================================================

  describe('Payload Validation', () => {
    it('should return 400 if userId is missing', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({ userId: '' }))
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing userId')
    })

    it('should return 400 if tier is missing', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({ tier: '' }))
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing tier or billingPeriod')
    })

    it('should return 400 if billingPeriod is missing', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({ billingPeriod: '' }))
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing tier or billingPeriod')
    })
  })

  // ==========================================================================
  // Transaction Approval
  // ==========================================================================

  describe('Transaction Approval', () => {
    it('should call approveTransaction with correct params', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        transactionId: 'txn-999',
        transactionToken: 'token-888',
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockApproveTransaction).toHaveBeenCalledWith({
        transactionId: 'txn-999',
        transactionToken: 'token-888',
      })
    })

    it('should return 500 if transaction approval fails', async () => {
      mockApproveTransaction.mockResolvedValue({ success: false, error: 'Approval failed' })
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to approve transaction')
    })
  })

  // ==========================================================================
  // First-Time vs Renewal Detection
  // ==========================================================================

  describe('First-Time vs Renewal Detection', () => {
    it('should treat as first-time when no subscription exists', async () => {
      mockGetSubscription.mockResolvedValue(null)
      const request = createJsonRequest({})

      await POST(request)

      expect(mockActivateSubscription).toHaveBeenCalled()
      expect(mockRenewSubscription).not.toHaveBeenCalled()
    })

    it('should treat as first-time when tier is null', async () => {
      mockGetSubscription.mockResolvedValue({ tier: null })
      const request = createJsonRequest({})

      await POST(request)

      expect(mockActivateSubscription).toHaveBeenCalled()
      expect(mockRenewSubscription).not.toHaveBeenCalled()
    })

    it('should treat as renewal when tier exists', async () => {
      mockGetSubscription.mockResolvedValue({ tier: 'momentum', status: 'active' })
      const request = createJsonRequest({})

      await POST(request)

      expect(mockRenewSubscription).toHaveBeenCalled()
      expect(mockActivateSubscription).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // First-Time Activation
  // ==========================================================================

  describe('First-Time Activation', () => {
    it('should call activateSubscription with correct params', async () => {
      mockGetSubscription.mockResolvedValue(null)
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        userId: 'user-abc',
        tier: 'accelerate',
        billingPeriod: 'yearly',
        transactionToken: 'token-123',
        recurringId: 'rec-456',
        transactionCode: 'code-789',
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockActivateSubscription).toHaveBeenCalledWith(
        expect.anything(), // supabase client
        'user-abc',
        'accelerate',
        'yearly',
        {
          transactionToken: 'token-123',
          recurringId: 'rec-456',
          transactionCode: 'code-789',
        }
      )
    })
  })

  // ==========================================================================
  // Renewal
  // ==========================================================================

  describe('Renewal', () => {
    it('should call renewSubscription with correct params', async () => {
      mockGetSubscription.mockResolvedValue({ tier: 'momentum', status: 'active' })
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        userId: 'user-xyz',
        transactionCode: 'code-renewal',
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockRenewSubscription).toHaveBeenCalledWith(
        expect.anything(), // supabase client
        'user-xyz',
        'code-renewal'
      )
    })
  })

  // ==========================================================================
  // Invoice Creation
  // ==========================================================================

  describe('Invoice Creation', () => {
    it('should create customer and invoice after subscription', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        email: 'invoice@test.com',
        name: 'Invoice User',
        tier: 'momentum',
        billingPeriod: 'monthly',
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockCreateOrFindCustomer).toHaveBeenCalledWith({
        name: 'Invoice User',
        email: 'invoice@test.com',
      })

      expect(mockCreateInvoiceReceipt).toHaveBeenCalledWith({
        customerId: 'cust-123',
        description: 'Signatura Momentum - Monthly Subscription',
        amount: 12,
      })
    })

    it('should skip invoice if no email in payload', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({ email: undefined }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockCreateOrFindCustomer).not.toHaveBeenCalled()
      expect(mockCreateInvoiceReceipt).not.toHaveBeenCalled()
    })

    it('should not fail webhook if invoice creation fails', async () => {
      mockCreateOrFindCustomer.mockRejectedValue(new Error('Morning API down'))
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should use "Customer" as default name if not provided', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        email: 'test@example.com',
        name: undefined,
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockCreateOrFindCustomer).toHaveBeenCalledWith({
        name: 'Customer',
        email: 'test@example.com',
      })
    })
  })

  // ==========================================================================
  // Invoice Description Formatting
  // ==========================================================================

  describe('Invoice Description Formatting', () => {
    it('should format monthly subscription correctly', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        email: 'test@example.com',
        tier: 'momentum',
        billingPeriod: 'monthly',
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockCreateInvoiceReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Signatura Momentum - Monthly Subscription',
          amount: 12,
        })
      )
    })

    it('should format quarterly subscription correctly', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        email: 'test@example.com',
        tier: 'accelerate',
        billingPeriod: 'quarterly',
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockCreateInvoiceReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Signatura Accelerate - Quarterly Subscription',
          amount: 45,
        })
      )
    })

    it('should format yearly subscription correctly', async () => {
      mockParseWebhookPayload.mockReturnValue(createMockPayload({
        email: 'test@example.com',
        tier: 'elite',
        billingPeriod: 'yearly',
      }))
      const request = createJsonRequest({})

      await POST(request)

      expect(mockCreateInvoiceReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Signatura Elite - Annual Subscription',
          amount: 249,
        })
      )
    })
  })

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return 500 on unexpected error', async () => {
      mockParseWebhookPayload.mockImplementation(() => {
        throw new Error('Unexpected error')
      })
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should return 500 if activateSubscription fails', async () => {
      mockGetSubscription.mockResolvedValue(null)
      mockActivateSubscription.mockRejectedValue(new Error('DB error'))
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should return 500 if renewSubscription fails', async () => {
      mockGetSubscription.mockResolvedValue({ tier: 'momentum' })
      mockRenewSubscription.mockRejectedValue(new Error('DB error'))
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  // ==========================================================================
  // Success Response
  // ==========================================================================

  describe('Success Response', () => {
    it('should return 200 with success:true on success', async () => {
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  // ==========================================================================
  // Always Active (Kill Switch Ignored)
  // ==========================================================================

  describe('Always Active', () => {
    it('should process webhooks regardless of kill switch state', async () => {
      // The webhook endpoint doesn't check isSubscriptionEnabled()
      // It always processes payments
      const request = createJsonRequest({})

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockActivateSubscription).toHaveBeenCalled()
    })
  })
})
