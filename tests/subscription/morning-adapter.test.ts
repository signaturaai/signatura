/**
 * Morning (Green Invoice) Adapter Tests (Phase 6.1)
 *
 * RALPH tests for the Morning invoice adapter.
 * Tests authentication, customer management, and invoice creation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  morningAuthenticate,
  createOrFindCustomer,
  createInvoiceReceipt,
  createCreditInvoice,
  clearTokenCache,
  type MorningCustomerResult,
  type MorningDocumentResult,
  type CreateCustomerParams,
  type CreateInvoiceParams,
} from '@/lib/subscription/morning-adapter'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// ============================================================================
// Test Setup
// ============================================================================

describe('Morning (Green Invoice) Adapter', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    clearTokenCache()
    process.env = {
      ...originalEnv,
      MORNING_API_URL: 'https://sandbox.d.greeninvoice.co.il/api/v1',
      MORNING_API_KEY: 'test-api-key-123',
      MORNING_API_SECRET: 'test-api-secret-xyz',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    clearTokenCache()
  })

  // ==========================================================================
  // morningAuthenticate Tests
  // ==========================================================================

  describe('morningAuthenticate', () => {
    it('should POST to /account/token with id and secret', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'jwt-token-abc' }),
      })

      await morningAuthenticate()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox.d.greeninvoice.co.il/api/v1/account/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should send api key as id and secret in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'jwt-token-abc' }),
      })

      await morningAuthenticate()

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.id).toBe('test-api-key-123')
      expect(body.secret).toBe('test-api-secret-xyz')
    })

    it('should return JWT token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'returned-jwt-token' }),
      })

      const token = await morningAuthenticate()

      expect(token).toBe('returned-jwt-token')
    })

    it('should cache token and reuse on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'cached-token' }),
      })

      // First call - should fetch
      const token1 = await morningAuthenticate()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const token2 = await morningAuthenticate()
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1

      expect(token1).toBe('cached-token')
      expect(token2).toBe('cached-token')
    })

    it('should refresh token after cache expiry', async () => {
      vi.useFakeTimers()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'first-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'refreshed-token' }),
        })

      // First call
      const token1 = await morningAuthenticate()
      expect(token1).toBe('first-token')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance time past 50 minutes
      vi.advanceTimersByTime(51 * 60 * 1000)

      // Second call after expiry - should fetch new token
      const token2 = await morningAuthenticate()
      expect(token2).toBe('refreshed-token')
      expect(mockFetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('should throw error on auth failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(morningAuthenticate()).rejects.toThrow('Morning auth error: 401 Unauthorized')
    })

    it('should throw error when response missing token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }), // No token field
      })

      await expect(morningAuthenticate()).rejects.toThrow('Morning auth response missing token')
    })

    it('should throw error when MORNING_API_URL is not set', async () => {
      delete process.env.MORNING_API_URL

      await expect(morningAuthenticate()).rejects.toThrow('MORNING_API_URL environment variable is not set')
    })

    it('should throw error when MORNING_API_KEY is not set', async () => {
      delete process.env.MORNING_API_KEY

      await expect(morningAuthenticate()).rejects.toThrow('MORNING_API_KEY environment variable is not set')
    })

    it('should throw error when MORNING_API_SECRET is not set', async () => {
      delete process.env.MORNING_API_SECRET

      await expect(morningAuthenticate()).rejects.toThrow('MORNING_API_SECRET environment variable is not set')
    })
  })

  // ==========================================================================
  // createOrFindCustomer Tests
  // ==========================================================================

  describe('createOrFindCustomer', () => {
    beforeEach(() => {
      // Mock authentication first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'auth-token' }),
      })
    })

    it('should search for existing customer by email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 'existing-customer-123', email: 'user@example.com' }] }),
      })

      await createOrFindCustomer({ name: 'John Doe', email: 'user@example.com' })

      // Second call should be the search
      const searchCall = mockFetch.mock.calls[1]
      expect(searchCall[0]).toBe('https://sandbox.d.greeninvoice.co.il/api/v1/clients/search')
      expect(searchCall[1].method).toBe('POST')

      const searchBody = JSON.parse(searchCall[1].body)
      expect(searchBody.email).toBe('user@example.com')
    })

    it('should return existing customer ID with isNew=false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 'existing-id-456', email: 'found@example.com' }] }),
      })

      const result = await createOrFindCustomer({ name: 'Jane', email: 'found@example.com' })

      expect(result.customerId).toBe('existing-id-456')
      expect(result.isNew).toBe(false)
    })

    it('should create new customer if not found', async () => {
      // Search returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      })
      // Create returns new ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-customer-789' }),
      })

      const result = await createOrFindCustomer({ name: 'New User', email: 'new@example.com' })

      expect(result.customerId).toBe('new-customer-789')
      expect(result.isNew).toBe(true)
    })

    it('should POST to /clients when creating new customer', async () => {
      // Search returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      })
      // Create returns new ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id' }),
      })

      await createOrFindCustomer({ name: 'Create Test', email: 'create@example.com' })

      // Third call (after auth and search) should be create
      const createCall = mockFetch.mock.calls[2]
      expect(createCall[0]).toBe('https://sandbox.d.greeninvoice.co.il/api/v1/clients')
      expect(createCall[1].method).toBe('POST')

      const createBody = JSON.parse(createCall[1].body)
      expect(createBody.name).toBe('Create Test')
      expect(createBody.emails).toEqual(['create@example.com'])
      expect(createBody.active).toBe(true)
    })

    it('should include Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 'id', email: 'e' }] }),
      })

      await createOrFindCustomer({ name: 'Auth Test', email: 'auth@example.com' })

      const searchCall = mockFetch.mock.calls[1]
      expect(searchCall[1].headers['Authorization']).toBe('Bearer auth-token')
    })

    it('should handle search returning undefined items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No items field
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-from-undefined' }),
      })

      const result = await createOrFindCustomer({ name: 'Test', email: 'test@example.com' })

      expect(result.customerId).toBe('new-from-undefined')
      expect(result.isNew).toBe(true)
    })
  })

  // ==========================================================================
  // createInvoiceReceipt Tests
  // ==========================================================================

  describe('createInvoiceReceipt', () => {
    beforeEach(() => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'auth-token' }),
      })
    })

    it('should POST to /documents', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'doc-123', url: 'https://example.com/doc' }),
      })

      await createInvoiceReceipt({
        customerId: 'cust-abc',
        description: 'Subscription',
        amount: 18,
      })

      const docCall = mockFetch.mock.calls[1]
      expect(docCall[0]).toBe('https://sandbox.d.greeninvoice.co.il/api/v1/documents')
      expect(docCall[1].method).toBe('POST')
    })

    it('should use document type 305 (tax invoice receipt)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'doc-123', url: 'https://example.com/doc' }),
      })

      await createInvoiceReceipt({
        customerId: 'cust-abc',
        description: 'Test',
        amount: 12,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)

      expect(body.type).toBe(305)
    })

    it('should use USD currency', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'doc-123', url: 'https://example.com/doc' }),
      })

      await createInvoiceReceipt({
        customerId: 'cust-abc',
        description: 'USD Test',
        amount: 29,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)

      expect(body.currency).toBe('USD')
      expect(body.income[0].currency).toBe('USD')
      expect(body.payment[0].currency).toBe('USD')
    })

    it('should include customer ID in client object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'doc-123', url: 'https://example.com/doc' }),
      })

      await createInvoiceReceipt({
        customerId: 'specific-customer-id',
        description: 'Test',
        amount: 12,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)

      expect(body.client.id).toBe('specific-customer-id')
    })

    it('should include income item with correct fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'doc-123', url: 'https://example.com/doc' }),
      })

      await createInvoiceReceipt({
        customerId: 'cust-abc',
        description: 'Accelerate Monthly Subscription',
        amount: 18,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)
      const income = body.income[0]

      expect(income.catalogNum).toBe('SUB-001')
      expect(income.description).toBe('Accelerate Monthly Subscription')
      expect(income.quantity).toBe(1)
      expect(income.price).toBe(18)
      expect(income.vatType).toBe(0)
    })

    it('should include payment with type 3 (credit card)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'doc-123', url: 'https://example.com/doc' }),
      })

      await createInvoiceReceipt({
        customerId: 'cust-abc',
        description: 'Test',
        amount: 99,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)
      const payment = body.payment[0]

      expect(payment.type).toBe(3)
      expect(payment.price).toBe(99)
      expect(payment.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
    })

    it('should return documentId and documentUrl', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'invoice-receipt-id-123',
          url: 'https://greeninvoice.co.il/docs/abc123',
        }),
      })

      const result = await createInvoiceReceipt({
        customerId: 'cust-abc',
        description: 'Test',
        amount: 12,
      })

      expect(result.documentId).toBe('invoice-receipt-id-123')
      expect(result.documentUrl).toBe('https://greeninvoice.co.il/docs/abc123')
    })

    it('should set lang to en', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'doc-123', url: 'https://example.com/doc' }),
      })

      await createInvoiceReceipt({
        customerId: 'cust-abc',
        description: 'Test',
        amount: 12,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)

      expect(body.lang).toBe('en')
    })
  })

  // ==========================================================================
  // createCreditInvoice Tests
  // ==========================================================================

  describe('createCreditInvoice', () => {
    beforeEach(() => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'auth-token' }),
      })
    })

    it('should use document type 330 (credit invoice)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'credit-123', url: 'https://example.com/credit' }),
      })

      await createCreditInvoice({
        customerId: 'cust-abc',
        description: 'Refund',
        amount: 18,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)

      expect(body.type).toBe(330)
    })

    it('should use USD currency', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'credit-123', url: 'https://example.com/credit' }),
      })

      await createCreditInvoice({
        customerId: 'cust-abc',
        description: 'Refund',
        amount: 29,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)

      expect(body.currency).toBe('USD')
    })

    it('should include all required fields same as invoice receipt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'credit-123', url: 'https://example.com/credit' }),
      })

      await createCreditInvoice({
        customerId: 'refund-customer',
        description: 'Subscription Cancellation Refund',
        amount: 45,
      })

      const docCall = mockFetch.mock.calls[1]
      const body = JSON.parse(docCall[1].body)

      // Client
      expect(body.client.id).toBe('refund-customer')

      // Income
      expect(body.income[0].catalogNum).toBe('SUB-001')
      expect(body.income[0].description).toBe('Subscription Cancellation Refund')
      expect(body.income[0].quantity).toBe(1)
      expect(body.income[0].price).toBe(45)
      expect(body.income[0].vatType).toBe(0)

      // Payment
      expect(body.payment[0].type).toBe(3)
      expect(body.payment[0].price).toBe(45)
      expect(body.payment[0].currency).toBe('USD')
    })

    it('should return documentId and documentUrl', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'credit-invoice-id-456',
          url: 'https://greeninvoice.co.il/docs/credit456',
        }),
      })

      const result = await createCreditInvoice({
        customerId: 'cust-abc',
        description: 'Refund',
        amount: 18,
      })

      expect(result.documentId).toBe('credit-invoice-id-456')
      expect(result.documentUrl).toBe('https://greeninvoice.co.il/docs/credit456')
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'auth-token' }),
      })
    })

    it('should throw error on API failure with error text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => '{"error": "Invalid document type"}',
      })

      await expect(
        createInvoiceReceipt({ customerId: 'cust', description: 'Test', amount: 10 })
      ).rejects.toThrow('Morning API error: 400 Bad Request')
    })

    it('should handle API failure when text() fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => { throw new Error('Cannot read response') },
      })

      await expect(
        createInvoiceReceipt({ customerId: 'cust', description: 'Test', amount: 10 })
      ).rejects.toThrow('Morning API error: 500 Internal Server Error - Unknown error')
    })
  })

  // ==========================================================================
  // Type Export Tests
  // ==========================================================================

  describe('Type Exports', () => {
    it('MorningCustomerResult should have customerId and isNew', () => {
      const result: MorningCustomerResult = {
        customerId: 'cust-123',
        isNew: true,
      }

      expect(result.customerId).toBeDefined()
      expect(result.isNew).toBeDefined()
    })

    it('MorningDocumentResult should have documentId and documentUrl', () => {
      const result: MorningDocumentResult = {
        documentId: 'doc-123',
        documentUrl: 'https://example.com/doc',
      }

      expect(result.documentId).toBeDefined()
      expect(result.documentUrl).toBeDefined()
    })

    it('CreateCustomerParams should have name and email', () => {
      const params: CreateCustomerParams = {
        name: 'John Doe',
        email: 'john@example.com',
      }

      expect(params.name).toBeDefined()
      expect(params.email).toBeDefined()
    })

    it('CreateInvoiceParams should have customerId, description, and amount', () => {
      const params: CreateInvoiceParams = {
        customerId: 'cust-123',
        description: 'Test subscription',
        amount: 18.00,
      }

      expect(params.customerId).toBeDefined()
      expect(params.description).toBeDefined()
      expect(params.amount).toBeDefined()
    })
  })

  // ==========================================================================
  // clearTokenCache Tests
  // ==========================================================================

  describe('clearTokenCache', () => {
    it('should clear cached token', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'first-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'second-token' }),
        })

      // First call - caches token
      const token1 = await morningAuthenticate()
      expect(token1).toBe('first-token')

      // Clear cache
      clearTokenCache()

      // Second call - should fetch new token
      const token2 = await morningAuthenticate()
      expect(token2).toBe('second-token')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
