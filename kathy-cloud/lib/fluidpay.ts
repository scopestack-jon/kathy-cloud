// FluidPay API integration
import logger from './logger'
import crypto from 'crypto'

// ============================================================================
// Configuration Types
// ============================================================================

export interface FluidPayConfig {
  apiKey: string
  environment: 'sandbox' | 'production'
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateInvoiceParams {
  companyName: string
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone?: string
  customerAddress?: {
    line1?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  amount: number  // in cents
  description: string
  invoiceNumber: string
  dueDate: Date
  paymentMethods?: ('card' | 'ach')[]
}

export interface InvoiceResponse {
  id: string
  hostedUrl: string
  publicUrl: string
  status: string
  invoiceNumber: string
}

interface FluidPayInvoiceItem {
  name: string
  unit_price: number
  quantity: number
}

interface FluidPayAddress {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address_line_1?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

interface FluidPayInvoiceRequest {
  currency: string
  company_name: string
  payable_to: FluidPayAddress
  bill_to: FluidPayAddress
  date_due: string
  items: FluidPayInvoiceItem[]
  payment_methods: string[]
  send_via: string
  invoice_number: string
}

interface FluidPayInvoiceResponse {
  status: string
  msg: string
  data: {
    id: string
    hosted_url: string
    public_url: string
    status: string
    invoice_number: string
    total: number
    balance: number
  }
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface FluidPayWebhookEvent {
  status: string
  msg: string
  type: string  // 'transaction_create' | 'transaction_update' | 'transaction_settlement'
  data: {
    id: string
    type: string
    status: string
    amount: number
    response: {
      card?: {
        card_holder: string
      }
    }
    billing_address?: {
      first_name?: string
      last_name?: string
      email?: string
    }
    custom_fields?: Record<string, string>
    order_id?: string
    po_number?: string
  }
}

// ============================================================================
// FluidPay Client
// ============================================================================

export class FluidPayClient {
  private baseUrl: string
  private apiKey: string

  constructor(config: FluidPayConfig) {
    if (!config.apiKey) {
      throw new Error('FluidPay API key is required')
    }

    this.apiKey = config.apiKey
    this.baseUrl = config.environment === 'production'
      ? 'https://app.fluidpay.com/api'
      : 'https://sandbox.fluidpay.com/api'
  }

  /**
   * Make authenticated request to FluidPay API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers = {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    logger.debug('FluidPay API request', {
      url,
      method: options.method || 'GET',
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok || data.status === 'error') {
        logger.error('FluidPay API error', {
          status: response.status,
          statusText: response.statusText,
          data,
          url,
        })
        throw new Error(
          `FluidPay API error: ${data.msg || response.statusText}`
        )
      }

      return data as T
    } catch (error) {
      logger.error('FluidPay API request failed', {
        error: error instanceof Error ? error.message : String(error),
        url,
      })
      throw error
    }
  }

  /**
   * Create an invoice with hosted payment page
   * Returns the hosted URL where customer can complete payment
   */
  async createInvoice(params: CreateInvoiceParams): Promise<InvoiceResponse> {
    logger.info('Creating FluidPay invoice', {
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      customerEmail: params.customerEmail,
    })

    // Parse customer name into first/last
    const nameParts = splitName(params.customerFirstName, params.customerLastName)

    const requestBody: FluidPayInvoiceRequest = {
      currency: 'USD',
      company_name: params.companyName,
      payable_to: {
        first_name: params.companyName.split(' ')[0] || 'Moving',
        last_name: params.companyName.split(' ').slice(1).join(' ') || 'Company',
        country: 'US',
      },
      bill_to: {
        first_name: nameParts.firstName,
        last_name: nameParts.lastName,
        email: params.customerEmail,
        phone: params.customerPhone,
        address_line_1: params.customerAddress?.line1,
        city: params.customerAddress?.city,
        state: params.customerAddress?.state,
        postal_code: params.customerAddress?.postalCode,
        country: params.customerAddress?.country || 'US',
      },
      date_due: params.dueDate.toISOString(),
      items: [{
        name: params.description,
        unit_price: params.amount,  // Already in cents
        quantity: 1,
      }],
      payment_methods: params.paymentMethods || ['card', 'ach'],
      send_via: 'none',  // Don't send email - we handle the redirect
      invoice_number: params.invoiceNumber,
    }

    const response = await this.request<FluidPayInvoiceResponse>('/invoice', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    logger.info('FluidPay invoice created', {
      id: response.data.id,
      hostedUrl: response.data.hosted_url,
      status: response.data.status,
    })

    return {
      id: response.data.id,
      hostedUrl: response.data.hosted_url,
      publicUrl: response.data.public_url,
      status: response.data.status,
      invoiceNumber: response.data.invoice_number,
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<InvoiceResponse> {
    logger.info('Getting FluidPay invoice', { invoiceId })

    const response = await this.request<FluidPayInvoiceResponse>(`/invoice/${invoiceId}`)

    return {
      id: response.data.id,
      hostedUrl: response.data.hosted_url,
      publicUrl: response.data.public_url,
      status: response.data.status,
      invoiceNumber: response.data.invoice_number,
    }
  }
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify FluidPay webhook signature
 * FluidPay uses HMAC SHA-256, Base64 URL encoded
 *
 * @param payload - Raw request body as string
 * @param signature - Value from 'Signature' header
 * @param secret - Signature UUID from FluidPay dashboard
 */
export function verifyFluidPayWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    logger.warn('Missing signature or secret for FluidPay webhook verification')
    return false
  }

  try {
    // FluidPay uses HMAC SHA-256, Base64 URL encoded
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

    if (!isValid) {
      logger.warn('FluidPay webhook signature mismatch', {
        received: signature.substring(0, 10) + '...',
        expected: expectedSignature.substring(0, 10) + '...',
      })
    }

    return isValid
  } catch (error) {
    logger.error('Error verifying FluidPay webhook signature', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Split a full name or first/last into separate parts
 */
function splitName(firstName: string, lastName: string): { firstName: string; lastName: string } {
  // If both provided, use as-is
  if (firstName && lastName) {
    return { firstName, lastName }
  }

  // If only firstName provided, it might be full name
  if (firstName && !lastName) {
    const parts = firstName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
      }
    }
    return { firstName: parts[0] || 'Customer', lastName: '' }
  }

  return { firstName: 'Customer', lastName: '' }
}

/**
 * Get base URL for FluidPay environment
 */
export function getFluidPayBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://app.fluidpay.com'
    : 'https://sandbox.fluidpay.com'
}
