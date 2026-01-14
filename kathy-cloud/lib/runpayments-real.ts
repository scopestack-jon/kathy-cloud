// RunPayments API integration - REAL IMPLEMENTATION
import logger from './logger'
import crypto from 'crypto'

export interface CreatePaymentSessionParams {
  amount: number
  currency: string
  invoiceId: string // Compound ID for tracking (orgId:invoiceId)
  originalInvoiceId?: string // Original invoice ID for display
  paymentSessionId: string
  description?: string
  // Optional customer prefill data
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
}

export interface PaymentSession {
  id: string
  amount: number
  currency: string
  paymentUrl: string
  status: string
}

/**
 * Create a payment session with RunPayments
 * Supports multiple integration modes
 */
export async function createPaymentSession(
  params: CreatePaymentSessionParams
): Promise<PaymentSession> {
  const apiUrl = process.env.RUNPAYMENTS_API_URL
  const apiKey = process.env.RUNPAYMENTS_API_KEY
  const mode = process.env.RUNPAYMENTS_MODE || 'stripe' // 'runpayments', 'stripe', 'mock'

  logger.info('Creating payment session', { mode, ...params })

  // MOCK MODE - for testing without real API
  if (mode === 'mock') {
    return createMockSession(params)
  }

  // STRIPE MODE (via RunPayments or direct)
  if (mode === 'stripe') {
    return createStripeSession(params)
  }

  // RUNPAYMENTS MODE (their native API)
  if (mode === 'runpayments') {
    return createRunPaymentsSession(params)
  }

  throw new Error(`Unknown RUNPAYMENTS_MODE: ${mode}`)
}

/**
 * Mock payment session (for testing)
 */
function createMockSession(params: CreatePaymentSessionParams): PaymentSession {
  const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  logger.info('Creating MOCK payment session', { mockId })
  
  return {
    id: mockId,
    amount: params.amount,
    currency: params.currency,
    paymentUrl: `https://mock-checkout.example.com/pay/${mockId}`,
    status: 'pending'
  }
}

/**
 * Stripe Checkout Session (direct or via RunPayments)
 */
async function createStripeSession(params: CreatePaymentSessionParams): Promise<PaymentSession> {
  const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.RUNPAYMENTS_API_KEY
  
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY or RUNPAYMENTS_API_KEY not configured')
  }

  logger.info('Creating Stripe checkout session')

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': params.currency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': params.description || `Invoice ${params.invoiceId}`,
        'line_items[0][price_data][unit_amount]': Math.round(params.amount * 100).toString(), // Convert to cents
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${process.env.NEXT_PUBLIC_API_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${process.env.NEXT_PUBLIC_API_URL}/payment-cancelled`,
        'metadata[invoiceId]': params.invoiceId,
        'metadata[paymentSessionId]': params.paymentSessionId,
        'metadata[source]': 'kathy'
      }).toString()
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('Stripe API error', { status: response.status, error })
      throw new Error(`Stripe API error: ${response.status}`)
    }

    const session = await response.json()

    return {
      id: session.id,
      amount: params.amount,
      currency: params.currency,
      paymentUrl: session.url,
      status: 'pending'
    }
  } catch (error) {
    logger.error('Error creating Stripe session', error)
    throw error
  }
}

/**
 * Refresh RunPayments API key using refresh token
 * Documentation: https://docs.runpayments.io/reference/payments-api/refresh-api-keys
 */
async function refreshRunPaymentsApiKey(): Promise<string> {
  const refreshToken = process.env.RUNPAYMENTS_REFRESH_TOKEN
  const currentApiKey = process.env.RUNPAYMENTS_API_KEY
  const refreshUrl = 'https://javelin.runpayments.io/api/v1/api_keys/refresh'

  if (!refreshToken) {
    throw new Error('RUNPAYMENTS_REFRESH_TOKEN must be configured')
  }

  if (!currentApiKey) {
    throw new Error('RUNPAYMENTS_API_KEY must be configured')
  }

  logger.info('Refreshing RunPayments API key')

  try {
    // Try: Use current api_key as Bearer token and refresh_token in body
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentApiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: refreshToken.trim()
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('RunPayments token refresh failed', {
        status: response.status,
        error: errorText
      })
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.api_key) {
      throw new Error('No api_key in refresh response')
    }

    logger.info('RunPayments API key refreshed successfully', {
      expiresAt: data.api_key_expires_at,
      hasNewKey: !!data.api_key
    })

    return data.api_key
  } catch (error) {
    logger.error('Error refreshing RunPayments API key', error)
    throw error
  }
}

/**
 * RunPayments - Hosted Payment Page (HPP)
 * Creates a hosted payment page via RunPayments HPP API
 * Documentation: https://docs.runpayments.io/reference/payments-api/create-hosted-payment-page
 */
async function createRunPaymentsSession(params: CreatePaymentSessionParams): Promise<PaymentSession> {
  const ccMid = process.env.RUNPAYMENTS_CC_MID
  const hppApiUrl = process.env.RUNPAYMENTS_HPP_API_URL || 'https://javelin.runpayments.io/api/v1/hpp'
  let apiKey = process.env.RUNPAYMENTS_API_KEY

  if (!apiKey) {
    throw new Error('RUNPAYMENTS_API_KEY must be configured')
  }

  if (!ccMid) {
    throw new Error('RUNPAYMENTS_CC_MID (credit card merchant ID) must be configured')
  }

  logger.info('Creating RunPayments Hosted Payment Page', {
    invoiceId: params.invoiceId,
    amount: params.amount,
    hppApiUrl,
    hasApiKey: !!apiKey,
    hasCcMid: !!ccMid
  })

  // Helper function to attempt HPP creation
  const attemptHppCreation = async (token: string): Promise<Response> => {
    // Build hpp_options array for custom fields  
    const hppOptions: Array<{ name: string; value: string; is_readonly?: boolean; is_required?: boolean }> = []
    
    // Add original invoice ID for display (or compound if original not provided)
    hppOptions.push({
      name: 'invoice_id',
      value: params.originalInvoiceId || params.invoiceId,
      is_readonly: true
    })
    
    // Add compound invoice ID for tracking and webhook matching
    hppOptions.push({
      name: 'custom_01',
      value: params.invoiceId,
      is_readonly: true
    })
    
    // Add payment session ID as custom field
    hppOptions.push({
      name: 'custom_02',
      value: params.paymentSessionId,
      is_readonly: true
    })
    
    // Add source identifier
    hppOptions.push({
      name: 'custom_03',
      value: 'kathy',
      is_readonly: true
    })
    
    // Add customer prefill data if provided
    if (params.customerName) {
      hppOptions.push({
        name: 'custom_04',
        value: params.customerName
      })
    }
    
    if (params.customerEmail) {
      hppOptions.push({
        name: 'email',
        value: params.customerEmail
      })
    }
    
    if (params.customerPhone) {
      hppOptions.push({
        name: 'phone',
        value: params.customerPhone
      })
    }
    
    if (params.customerAddress?.street) {
      hppOptions.push({
        name: 'address',
        value: params.customerAddress.street
      })
    }
    
    // Create HPP via API
    const requestBody = {
      name: params.description || `Invoice ${params.invoiceId}`,
      cc_mid: ccMid.trim(),
      amount: params.amount.toFixed(2),
      lock_amount: true,
      disable_after_payment: true,
      name_on_account: params.customerName || '',
      hpp_options: hppOptions
    }
    
    logger.info('Sending HPP API request', {
      url: hppApiUrl,
      bodyPreview: {
        name: requestBody.name,
        cc_mid: requestBody.cc_mid,
        amount: requestBody.amount,
        hpp_options_count: hppOptions.length
      }
    })
    
    return await fetch(hppApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
  }

  try {
    // First attempt with current API key
    let response = await attemptHppCreation(apiKey)

    // If 401 Unauthorized, try refreshing the API key and retry
    if (response.status === 401) {
      logger.info('Got 401, attempting to refresh API key')
      
      try {
        const newApiKey = await refreshRunPaymentsApiKey()
        logger.info('Retrying HPP creation with refreshed API key')
        response = await attemptHppCreation(newApiKey)
      } catch (refreshError) {
        logger.error('Failed to refresh API key', refreshError)
        // Continue with original 401 error handling below
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('RunPayments HPP API error', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText,
        requestBody: {
          name: params.description || `Invoice ${params.invoiceId}`,
          cc_mid: ccMid.trim(),
          amount: params.amount.toFixed(2),
          hasApiKey: !!apiKey,
          hppApiUrl
        }
      })
      throw new Error(`RunPayments HPP API error: ${response.status} - ${errorText}`)
    }

    const hppResponse = await response.json()
    
    if (!hppResponse.url) {
      logger.error('No URL in HPP response', { response: hppResponse })
      throw new Error('RunPayments HPP API did not return a URL')
    }

    logger.info('RunPayments HPP created successfully', { 
      invoiceId: params.invoiceId,
      amount: params.amount,
      hppUrl: hppResponse.url.substring(0, 100) + '...'
    })

    return {
      id: params.paymentSessionId,
      amount: params.amount,
      currency: params.currency,
      paymentUrl: hppResponse.url,
      status: 'pending'
    }
  } catch (error) {
    logger.error('Error creating RunPayments HPP', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      invoiceId: params.invoiceId,
      amount: params.amount
    })
    throw error
  }
}

/**
 * Verify webhook signature from RunPayments/Stripe
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const mode = process.env.RUNPAYMENTS_MODE || 'stripe'

  // In development, optionally skip verification
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
    logger.warn('Skipping webhook signature verification (development mode)')
    return true
  }

  // Stripe signature verification
  if (mode === 'stripe') {
    return verifyStripeSignature(payload, signature, secret)
  }

  // RunPayments signature verification (HMAC SHA256)
  if (mode === 'runpayments') {
    return verifyHmacSignature(payload, signature, secret)
  }

  // Mock mode - always valid
  if (mode === 'mock') {
    return true
  }

  logger.error('Unknown verification mode', { mode })
  return false
}

/**
 * Stripe signature verification
 */
function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Stripe signature format: t=timestamp,v1=signature
    const elements = signature.split(',')
    const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1]
    const sig = elements.find(e => e.startsWith('v1='))?.split('=')[1]

    if (!timestamp || !sig) {
      logger.warn('Invalid Stripe signature format')
      return false
    }

    // Construct signed payload
    const signedPayload = `${timestamp}.${payload}`
    
    // Compute expected signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    )
  } catch (error) {
    logger.error('Error verifying Stripe signature', error)
    return false
  }
}

/**
 * Generic HMAC SHA256 signature verification
 */
function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    logger.error('Error verifying HMAC signature', error)
    return false
  }
}

