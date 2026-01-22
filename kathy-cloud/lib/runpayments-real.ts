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
    // Use current api_key as Bearer token and both token + refresh_token in body
    // Documentation: https://docs.runpayments.io/reference/payments-api/refresh-api-keys
    // The body requires both the current api_key (as "token") and the refresh_token
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentApiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: currentApiKey.trim(), // Current api_key
        refresh_token: refreshToken.trim() // Refresh token
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
 * RunPayments - Direct Hosted Payment Page Link
 * Opens the HPP directly for manual entry
 * Webhook will notify us when payment completes
 */
async function createRunPaymentsSession(params: CreatePaymentSessionParams): Promise<PaymentSession> {
  const captureBaseUrl = (process.env.RUNPAYMENTS_CAPTURE_BASE_URL || 'https://pay.sandbox.runpayments-ab.io/capture').trim()

  logger.info('Creating RunPayments Direct HPP Link', {
    invoiceId: params.invoiceId,
    amount: params.amount,
    captureBaseUrl
  })

  // Return the bare HPP URL - user will manually enter all payment details
  const paymentUrl = captureBaseUrl

  logger.info('RunPayments Direct HPP URL created', {
    invoiceId: params.invoiceId,
    amount: params.amount,
    paymentUrl
  })

  return {
    id: params.paymentSessionId,
    amount: params.amount,
    currency: params.currency,
    paymentUrl: paymentUrl,
    status: 'pending'
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

  // Optionally skip verification (for testing)
  if (process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
    logger.warn('Skipping webhook signature verification')
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

