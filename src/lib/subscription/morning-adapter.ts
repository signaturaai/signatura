/**
 * Morning (Green Invoice / חשבונית ירוקה) Adapter
 *
 * Server-only module for creating invoices via the Morning API.
 * All amounts are in USD.
 *
 * @module morning-adapter
 * @server-only
 */

// ============================================================================
// Types
// ============================================================================

export interface MorningCustomerResult {
  customerId: string
  isNew: boolean
}

export interface MorningDocumentResult {
  documentId: string
  documentUrl: string
}

export interface CreateCustomerParams {
  name: string
  email: string
}

export interface CreateInvoiceParams {
  customerId: string
  description: string
  amount: number
}

// ============================================================================
// Token Cache
// ============================================================================

interface TokenCache {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

// Token expiry: 50 minutes (Morning tokens last ~1 hour, we refresh early)
const TOKEN_EXPIRY_MS = 50 * 60 * 1000

/**
 * Clear the token cache (useful for testing)
 */
export function clearTokenCache(): void {
  tokenCache = null
}

// ============================================================================
// Configuration
// ============================================================================

function getMorningConfig() {
  const apiUrl = process.env.MORNING_API_URL
  const apiKey = process.env.MORNING_API_KEY
  const apiSecret = process.env.MORNING_API_SECRET

  if (!apiUrl) {
    throw new Error('MORNING_API_URL environment variable is not set')
  }

  if (!apiKey) {
    throw new Error('MORNING_API_KEY environment variable is not set')
  }

  if (!apiSecret) {
    throw new Error('MORNING_API_SECRET environment variable is not set')
  }

  return { apiUrl, apiKey, apiSecret }
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Authenticate with Morning API and get a JWT token
 *
 * Caches the token in a module-level variable with 50-minute expiry.
 * Morning tokens last ~1 hour, so we refresh early to avoid expiration.
 *
 * @returns JWT token string
 */
export async function morningAuthenticate(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const { apiUrl, apiKey, apiSecret } = getMorningConfig()

  const response = await fetch(`${apiUrl}/account/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: apiKey,
      secret: apiSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`Morning auth error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.token) {
    throw new Error('Morning auth response missing token')
  }

  // Cache the token with 50-minute expiry
  tokenCache = {
    token: data.token,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  }

  return data.token
}

// ============================================================================
// Helper: Authenticated API Call
// ============================================================================

async function morningApiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, unknown>
): Promise<T> {
  const { apiUrl } = getMorningConfig()
  const token = await morningAuthenticate()

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${apiUrl}${endpoint}`, options)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Morning API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

// ============================================================================
// Customer Functions
// ============================================================================

/**
 * Create or find a customer by email
 *
 * First searches for existing customer by email. If found, returns their ID.
 * If not found, creates a new customer and returns the new ID.
 *
 * @param params - Customer name and email
 * @returns Customer ID and whether it was newly created
 */
export async function createOrFindCustomer(
  params: CreateCustomerParams
): Promise<MorningCustomerResult> {
  const { name, email } = params

  // Search for existing customer by email
  const searchResult = await morningApiCall<{
    items?: Array<{ id: string; email: string }>
  }>('/clients/search', 'POST', {
    email,
  })

  // Check if customer exists
  if (searchResult.items && searchResult.items.length > 0) {
    return {
      customerId: searchResult.items[0].id,
      isNew: false,
    }
  }

  // Create new customer
  const createResult = await morningApiCall<{ id: string }>('/clients', 'POST', {
    name,
    emails: [email],
    active: true,
  })

  return {
    customerId: createResult.id,
    isNew: true,
  }
}

// ============================================================================
// Invoice Functions
// ============================================================================

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Create a tax invoice receipt (type 305)
 *
 * Used for regular subscription payments.
 *
 * @param params - Customer ID, description, and amount in USD
 * @returns Document ID and URL
 */
export async function createInvoiceReceipt(
  params: CreateInvoiceParams
): Promise<MorningDocumentResult> {
  const { customerId, description, amount } = params
  const dateString = getCurrentDateString()

  const result = await morningApiCall<{
    id: string
    url: string
  }>('/documents', 'POST', {
    type: 305, // Tax invoice receipt
    client: {
      id: customerId,
    },
    currency: 'USD',
    lang: 'en',
    income: [
      {
        catalogNum: 'SUB-001',
        description,
        quantity: 1,
        price: amount,
        currency: 'USD',
        vatType: 0, // No VAT for foreign customers
      },
    ],
    payment: [
      {
        type: 3, // Credit card
        date: dateString,
        price: amount,
        currency: 'USD',
      },
    ],
  })

  return {
    documentId: result.id,
    documentUrl: result.url,
  }
}

/**
 * Create a credit invoice (type 330)
 *
 * Used for refunds and cancellations.
 *
 * @param params - Customer ID, description, and amount in USD
 * @returns Document ID and URL
 */
export async function createCreditInvoice(
  params: CreateInvoiceParams
): Promise<MorningDocumentResult> {
  const { customerId, description, amount } = params
  const dateString = getCurrentDateString()

  const result = await morningApiCall<{
    id: string
    url: string
  }>('/documents', 'POST', {
    type: 330, // Credit invoice
    client: {
      id: customerId,
    },
    currency: 'USD',
    lang: 'en',
    income: [
      {
        catalogNum: 'SUB-001',
        description,
        quantity: 1,
        price: amount,
        currency: 'USD',
        vatType: 0,
      },
    ],
    payment: [
      {
        type: 3, // Credit card
        date: dateString,
        price: amount,
        currency: 'USD',
      },
    ],
  })

  return {
    documentId: result.id,
    documentUrl: result.url,
  }
}
