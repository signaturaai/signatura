/**
 * Grow Payment Adapter Tests (Phase 5.1)
 *
 * RALPH tests for the Grow (Meshulam) payment gateway adapter.
 * Tests form-encoded API calls, payment flows, and webhook handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  growApiCall,
  createRecurringPayment,
  createOneTimeCharge,
  approveTransaction,
  parseWebhookPayload,
  verifyWebhook,
  type GrowWebhookPayload,
  type CreateRecurringPaymentParams,
  type CreateOneTimeChargeParams,
  type ApproveTransactionParams,
} from '@/lib/subscription/grow-adapter'
import { getPrice } from '@/lib/subscription/config'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// ============================================================================
// Test Setup
// ============================================================================

describe('Grow Payment Adapter', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = {
      ...originalEnv,
      GROW_API_URL: 'https://sandbox.meshulam.co.il/api/light/server/1.0',
      GROW_USER_ID: 'test-user-123',
      GROW_WEBHOOK_KEY: 'test-webhook-key-abc',
      GROW_PAGE_CODE_MOMENTUM_MONTHLY: 'page-mom-mon',
      GROW_PAGE_CODE_MOMENTUM_QUARTERLY: 'page-mom-qtr',
      GROW_PAGE_CODE_MOMENTUM_YEARLY: 'page-mom-yr',
      GROW_PAGE_CODE_ACCELERATE_MONTHLY: 'page-acc-mon',
      GROW_PAGE_CODE_ACCELERATE_QUARTERLY: 'page-acc-qtr',
      GROW_PAGE_CODE_ACCELERATE_YEARLY: 'page-acc-yr',
      GROW_PAGE_CODE_ELITE_MONTHLY: 'page-eli-mon',
      GROW_PAGE_CODE_ELITE_QUARTERLY: 'page-eli-qtr',
      GROW_PAGE_CODE_ELITE_YEARLY: 'page-eli-yr',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ==========================================================================
  // growApiCall Tests
  // ==========================================================================

  describe('growApiCall', () => {
    it('should make form-encoded POST request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: {} }),
      })

      await growApiCall('/test-endpoint', { field1: 'value1' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.meshulam.co.il/api/light/server/1.0/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      )
    })

    it('should include userId in all requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1 }),
      })

      await growApiCall('/test', { customField: 'test' })

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('userId=test-user-123')
      expect(body).toContain('customField=test')
    })

    it('should URL-encode form fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1 }),
      })

      await growApiCall('/test', { email: 'test@example.com', name: 'John Doe' })

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('email=test%40example.com')
      expect(body).toContain('name=John+Doe')
    })

    it('should return parsed JSON response', async () => {
      const mockResponse = { status: 1, data: { url: 'https://pay.example.com' } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await growApiCall('/test', {})

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(growApiCall('/test', {})).rejects.toThrow('Grow API error: 500 Internal Server Error')
    })

    it('should throw error when GROW_API_URL is not set', async () => {
      delete process.env.GROW_API_URL

      await expect(growApiCall('/test', {})).rejects.toThrow('GROW_API_URL environment variable is not set')
    })

    it('should throw error when GROW_USER_ID is not set', async () => {
      delete process.env.GROW_USER_ID

      await expect(growApiCall('/test', {})).rejects.toThrow('GROW_USER_ID environment variable is not set')
    })
  })

  // ==========================================================================
  // createRecurringPayment Tests
  // ==========================================================================

  describe('createRecurringPayment', () => {
    const baseParams: CreateRecurringPaymentParams = {
      tier: 'momentum',
      billingPeriod: 'monthly',
      userId: 'user-abc-123',
      notifyUrl: 'https://app.example.com/api/webhooks/grow',
      successUrl: 'https://app.example.com/subscription/success',
      cancelUrl: 'https://app.example.com/subscription/cancel',
    }

    it('should use correct page code env var name pattern', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { url: 'https://pay.example.com' } }),
      })

      await createRecurringPayment({ ...baseParams, tier: 'accelerate', billingPeriod: 'quarterly' })

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('pageCode=page-acc-qtr')
    })

    it('should include price from config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { url: 'https://pay.example.com' } }),
      })

      await createRecurringPayment({ ...baseParams, tier: 'momentum', billingPeriod: 'monthly' })

      const expectedPrice = getPrice('momentum', 'monthly') // $12
      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain(`sum=${expectedPrice}`)
    })

    it('should set paymentNum to 0 for recurring', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { url: 'https://pay.example.com' } }),
      })

      await createRecurringPayment(baseParams)

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('paymentNum=0')
    })

    it('should include cField1=userId, cField2=tier, cField3=billingPeriod', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { url: 'https://pay.example.com' } }),
      })

      await createRecurringPayment({
        ...baseParams,
        tier: 'elite',
        billingPeriod: 'yearly',
        userId: 'custom-user-id',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('cField1=custom-user-id')
      expect(body).toContain('cField2=elite')
      expect(body).toContain('cField3=yearly')
    })

    it('should include callback URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { url: 'https://pay.example.com' } }),
      })

      await createRecurringPayment(baseParams)

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('notifyUrl=' + encodeURIComponent(baseParams.notifyUrl))
      expect(body).toContain('successUrl=' + encodeURIComponent(baseParams.successUrl))
      expect(body).toContain('cancelUrl=' + encodeURIComponent(baseParams.cancelUrl))
    })

    it('should include optional email and name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { url: 'https://pay.example.com' } }),
      })

      await createRecurringPayment({
        ...baseParams,
        email: 'user@example.com',
        name: 'John Smith',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('email=user%40example.com')
      expect(body).toContain('fullName=John+Smith')
    })

    it('should return success with paymentUrl on status 1', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { url: 'https://pay.meshulam.co.il/abc123' } }),
      })

      const result = await createRecurringPayment(baseParams)

      expect(result.success).toBe(true)
      expect(result.paymentUrl).toBe('https://pay.meshulam.co.il/abc123')
      expect(result.error).toBeUndefined()
    })

    it('should return error on non-1 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, err: { message: 'Invalid page code' } }),
      })

      const result = await createRecurringPayment(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid page code')
      expect(result.paymentUrl).toBeUndefined()
    })

    it('should return error when page code env var is missing', async () => {
      delete process.env.GROW_PAGE_CODE_MOMENTUM_MONTHLY

      const result = await createRecurringPayment(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toContain('GROW_PAGE_CODE_MOMENTUM_MONTHLY')
    })

    describe('all 9 tier × period combinations', () => {
      const tiers = ['momentum', 'accelerate', 'elite'] as const
      const periods = ['monthly', 'quarterly', 'yearly'] as const

      tiers.forEach(tier => {
        periods.forEach(period => {
          it(`should use correct page code for ${tier} ${period}`, async () => {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({ status: 1, data: { url: 'https://pay.example.com' } }),
            })

            await createRecurringPayment({ ...baseParams, tier, billingPeriod: period })

            const expectedEnvVar = `GROW_PAGE_CODE_${tier.toUpperCase()}_${period.toUpperCase()}`
            const expectedPageCode = process.env[expectedEnvVar]

            const callArgs = mockFetch.mock.calls[0]
            const body = callArgs[1].body as string

            expect(body).toContain(`pageCode=${expectedPageCode}`)
          })
        })
      })
    })
  })

  // ==========================================================================
  // createOneTimeCharge Tests
  // ==========================================================================

  describe('createOneTimeCharge', () => {
    const baseParams: CreateOneTimeChargeParams = {
      amount: 5.50,
      description: 'Prorated upgrade charge',
      userId: 'user-123',
      transactionToken: 'token-abc-xyz',
    }

    it('should call chargeToken endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { transactionId: 'txn-123' } }),
      })

      await createOneTimeCharge(baseParams)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chargeToken'),
        expect.any(Object)
      )
    })

    it('should include amount, description, userId, and token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1 }),
      })

      await createOneTimeCharge(baseParams)

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('sum=5.5')
      expect(body).toContain('description=Prorated+upgrade+charge')
      expect(body).toContain('cField1=user-123')
      expect(body).toContain('transactionToken=token-abc-xyz')
    })

    it('should return success with transactionId on status 1', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, data: { transactionId: 'txn-success-123' } }),
      })

      const result = await createOneTimeCharge(baseParams)

      expect(result.success).toBe(true)
      expect(result.transactionId).toBe('txn-success-123')
    })

    it('should return error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, err: { message: 'Card declined' } }),
      })

      const result = await createOneTimeCharge(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Card declined')
    })
  })

  // ==========================================================================
  // approveTransaction Tests
  // ==========================================================================

  describe('approveTransaction', () => {
    const baseParams: ApproveTransactionParams = {
      transactionId: 'txn-pending-123',
      transactionToken: 'token-xyz',
    }

    it('should call approveTransaction endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1 }),
      })

      await approveTransaction(baseParams)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/approveTransaction'),
        expect.any(Object)
      )
    })

    it('should include transactionId and transactionToken', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1 }),
      })

      await approveTransaction(baseParams)

      const callArgs = mockFetch.mock.calls[0]
      const body = callArgs[1].body as string

      expect(body).toContain('transactionId=txn-pending-123')
      expect(body).toContain('transactionToken=token-xyz')
    })

    it('should return success on status 1', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1 }),
      })

      const result = await approveTransaction(baseParams)

      expect(result.success).toBe(true)
    })

    it('should return error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0, err: { message: 'Transaction already approved' } }),
      })

      const result = await approveTransaction(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Transaction already approved')
    })
  })

  // ==========================================================================
  // parseWebhookPayload Tests
  // ==========================================================================

  describe('parseWebhookPayload', () => {
    it('should extract userId from cField1', () => {
      const payload = parseWebhookPayload({ cField1: 'user-from-webhook' })
      expect(payload.userId).toBe('user-from-webhook')
    })

    it('should extract tier from cField2', () => {
      const payload = parseWebhookPayload({ cField2: 'accelerate' })
      expect(payload.tier).toBe('accelerate')
    })

    it('should extract billingPeriod from cField3', () => {
      const payload = parseWebhookPayload({ cField3: 'quarterly' })
      expect(payload.billingPeriod).toBe('quarterly')
    })

    it('should extract transaction details', () => {
      const payload = parseWebhookPayload({
        transactionId: 'txn-123',
        transactionToken: 'token-abc',
        transactionCode: 'code-xyz',
        status: 'success',
      })

      expect(payload.transactionId).toBe('txn-123')
      expect(payload.transactionToken).toBe('token-abc')
      expect(payload.transactionCode).toBe('code-xyz')
      expect(payload.status).toBe('success')
    })

    it('should extract payment details', () => {
      const payload = parseWebhookPayload({
        sum: '29.99',
        currency: 'USD',
      })

      expect(payload.sum).toBe(29.99)
      expect(payload.currency).toBe('USD')
    })

    it('should extract optional recurring ID', () => {
      const payload = parseWebhookPayload({ recurringId: 'rec-456' })
      expect(payload.recurringId).toBe('rec-456')
    })

    it('should extract optional email and name', () => {
      const payload = parseWebhookPayload({
        email: 'user@example.com',
        fullName: 'John Doe',
      })

      expect(payload.email).toBe('user@example.com')
      expect(payload.name).toBe('John Doe')
    })

    it('should preserve rawPayload', () => {
      const raw = { cField1: 'user', customField: 'value', nested: { a: 1 } }
      const payload = parseWebhookPayload(raw)

      expect(payload.rawPayload).toEqual(raw)
    })

    it('should provide defaults for missing fields', () => {
      const payload = parseWebhookPayload({})

      expect(payload.userId).toBe('')
      expect(payload.tier).toBe('momentum')
      expect(payload.billingPeriod).toBe('monthly')
      expect(payload.transactionId).toBe('')
      expect(payload.sum).toBe(0)
      expect(payload.currency).toBe('ILS')
    })

    it('should handle complete webhook payload', () => {
      const raw = {
        transactionId: 'txn-complete-123',
        transactionToken: 'token-complete-abc',
        transactionCode: '000',
        status: '1',
        sum: '18',
        currency: 'USD',
        cField1: 'user-uuid-here',
        cField2: 'accelerate',
        cField3: 'monthly',
        recurringId: 'rec-789',
        email: 'subscriber@example.com',
        fullName: 'Jane Smith',
        webhookKey: 'secret-key',
      }

      const payload = parseWebhookPayload(raw)

      expect(payload.transactionId).toBe('txn-complete-123')
      expect(payload.transactionToken).toBe('token-complete-abc')
      expect(payload.transactionCode).toBe('000')
      expect(payload.status).toBe('1')
      expect(payload.sum).toBe(18)
      expect(payload.currency).toBe('USD')
      expect(payload.userId).toBe('user-uuid-here')
      expect(payload.tier).toBe('accelerate')
      expect(payload.billingPeriod).toBe('monthly')
      expect(payload.recurringId).toBe('rec-789')
      expect(payload.email).toBe('subscriber@example.com')
      expect(payload.name).toBe('Jane Smith')
      expect(payload.rawPayload).toEqual(raw)
    })
  })

  // ==========================================================================
  // verifyWebhook Tests
  // ==========================================================================

  describe('verifyWebhook', () => {
    it('should return true for matching webhook key', () => {
      const result = verifyWebhook({ webhookKey: 'test-webhook-key-abc' })
      expect(result).toBe(true)
    })

    it('should return false for non-matching webhook key', () => {
      const result = verifyWebhook({ webhookKey: 'wrong-key' })
      expect(result).toBe(false)
    })

    it('should return false when webhookKey is missing from body', () => {
      const result = verifyWebhook({ otherField: 'value' })
      expect(result).toBe(false)
    })

    it('should return false when GROW_WEBHOOK_KEY is not set', () => {
      delete process.env.GROW_WEBHOOK_KEY

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = verifyWebhook({ webhookKey: 'any-key' })

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('GROW_WEBHOOK_KEY is not set - rejecting webhook')

      consoleSpy.mockRestore()
    })

    it('should use constant-time comparison (different lengths)', () => {
      // Should still return false but not leak timing info
      const result = verifyWebhook({ webhookKey: 'short' })
      expect(result).toBe(false)
    })

    it('should use constant-time comparison (same length, different content)', () => {
      // Same length as 'test-webhook-key-abc' (19 chars)
      const result = verifyWebhook({ webhookKey: 'xxxx-xxxxxxx-xxx-xxx' })
      expect(result).toBe(false)
    })

    it('should return false for empty webhook key', () => {
      const result = verifyWebhook({ webhookKey: '' })
      expect(result).toBe(false)
    })
  })

  // ==========================================================================
  // Type Export Tests
  // ==========================================================================

  describe('Type Exports', () => {
    it('GrowWebhookPayload should have all required fields', () => {
      const payload: GrowWebhookPayload = {
        transactionId: 'txn',
        transactionToken: 'token',
        transactionCode: 'code',
        status: 'success',
        sum: 100,
        currency: 'USD',
        userId: 'user',
        tier: 'momentum',
        billingPeriod: 'monthly',
        rawPayload: {},
      }

      expect(payload.transactionId).toBeDefined()
      expect(payload.userId).toBeDefined()
      expect(payload.tier).toBeDefined()
      expect(payload.billingPeriod).toBeDefined()
    })

    it('GrowWebhookPayload should support optional fields', () => {
      const payload: GrowWebhookPayload = {
        transactionId: 'txn',
        transactionToken: 'token',
        transactionCode: 'code',
        status: 'success',
        sum: 100,
        currency: 'USD',
        userId: 'user',
        tier: 'elite',
        billingPeriod: 'yearly',
        recurringId: 'rec-123',
        email: 'test@example.com',
        name: 'Test User',
        rawPayload: {},
      }

      expect(payload.recurringId).toBe('rec-123')
      expect(payload.email).toBe('test@example.com')
      expect(payload.name).toBe('Test User')
    })
  })
})
