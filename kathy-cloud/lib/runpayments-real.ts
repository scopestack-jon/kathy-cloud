// RunPayments API integration - REAL IMPLEMENTATION
import logger from './logger'
import crypto from 'crypto'

export interface CreatePaymentSessionParams {
  amount: number
  currency: string
  invoiceId: string
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
 * RunPayments - Hosted Payment Page
 * Uses RunPayments' hosted capture page with URL parameters
 */
async function createRunPaymentsSession(params: CreatePaymentSessionParams): Promise<PaymentSession> {
  const apiKey = process.env.RUNPAYMENTS_API_KEY
  // Allow configurable capture base URL (production or sandbox)
  const captureBaseUrl = process.env.RUNPAYMENTS_CAPTURE_BASE_URL || 'https://pay.sandbox.runpayments-ab.io/capture'

  if (!apiKey) {
    throw new Error('RUNPAYMENTS_API_KEY must be configured')
  }

  logger.info('Creating RunPayments hosted payment URL', {
    invoiceId: params.invoiceId,
    amount: params.amount,
    captureBaseUrl: captureBaseUrl.substring(0, 50) + '...' // Log partial URL for security
  })

  try {
    // Build the hosted payment page URL with parameters
    // Format: <base_url>?source_key=XXX&amount=YYY&invoice=ZZZ
    const paymentUrl = new URL(captureBaseUrl)
    
    // Add required parameters (trim API key to remove any whitespace/newlines)
    paymentUrl.searchParams.set('source_key', apiKey.trim())
    paymentUrl.searchParams.set('amount', params.amount.toFixed(2))
    paymentUrl.searchParams.set('invoice', params.invoiceId)
    
    // Add optional parameters
    if (params.description) {
      paymentUrl.searchParams.set('description', params.description)
    }
    
    // Add customer prefill data (if provided and supported by RunPayments)
    if (params.customerName) {
      paymentUrl.searchParams.set('customer_name', params.customerName)
    }
    
    if (params.customerEmail) {
      paymentUrl.searchParams.set('customer_email', params.customerEmail)
    }
    
    if (params.customerPhone) {
      paymentUrl.searchParams.set('customer_phone', params.customerPhone)
    }
    
    if (params.customerAddress) {
      if (params.customerAddress.street) {
        paymentUrl.searchParams.set('billing_address_line1', params.customerAddress.street)
      }
      if (params.customerAddress.city) {
        paymentUrl.searchParams.set('billing_address_city', params.customerAddress.city)
      }
      if (params.customerAddress.state) {
        paymentUrl.searchParams.set('billing_address_state', params.customerAddress.state)
      }
      if (params.customerAddress.zip) {
        paymentUrl.searchParams.set('billing_address_postal_code', params.customerAddress.zip)
      }
      if (params.customerAddress.country) {
        paymentUrl.searchParams.set('billing_address_country', params.customerAddress.country)
      }
    }
    
    // Add metadata in URL parameters (RunPayments will include in webhook)
    paymentUrl.searchParams.set('metadata[paymentSessionId]', params.paymentSessionId)
    paymentUrl.searchParams.set('metadata[source]', 'kathy')

    const finalUrl = paymentUrl.toString()

    logger.info('RunPayments payment URL created', { 
      invoiceId: params.invoiceId,
      url: finalUrl.substring(0, 100) + '...' // Log partial URL for security
    })

    return {
      id: params.paymentSessionId, // Use our session ID as the payment ID
      amount: params.amount,
      currency: params.currency,
      paymentUrl: finalUrl,
      status: 'pending'
    }
  } catch (error) {
    logger.error('Error creating RunPayments payment URL', error)
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

