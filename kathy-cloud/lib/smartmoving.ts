// SmartMoving API integration
import logger from './logger'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface SmartMovingConfig {
  apiKey: string
  clientId: string
  enabled: boolean
  ccProcessingFeePercent?: number
  confirmCategory?: string
  depositFieldNames?: string[]  // ["Travel Fee", "Trip Charge"] - fields to extract deposit from
  paymentPageEnabled?: boolean  // Feature flag for customer self-service payment page
}

export interface SmartMovingCustomer {
  id: string
  name: string
  emailAddress: string
  phoneNumber?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
}

export interface SmartMovingJob {
  id: string
  opportunityId: string
  jobType?: string
  confirmed?: boolean
  accountingNotes?: string
  customerNotes?: string
  crewNotes?: string
}

export interface SmartMovingOpportunity {
  id: string
  quoteNumber?: string
  status: number // 1=Hot Lead, 2=New Lead, 3=Opportunity, 4=Booked, etc.
  leadStatus?: string // "Deposit Pending", "Booked", etc.
  customer: SmartMovingCustomer
  estimatedTotal?: {
    finalTotal?: number
  }
  depositAmount?: number
  jobs?: SmartMovingJob[]
}

export interface SmartMovingLeadSearchResult {
  id: string
  name: string
  emailAddress: string
  phoneNumber?: string
  status: number
  leadStatus?: string
  opportunityId?: string
  quoteNumber?: string
}

export interface SmartMovingPaginatedResponse<T> {
  pageNumber: number
  pageSize: number
  lastPage: boolean
  totalPages: number
  totalResults: number
  totalThisPage: number
  pageResults: T[]
}

export interface UpdateJobNotesParams {
  accountingNotes?: string
  customerNotes?: string
  crewNotes?: string
}

// ============================================================================
// Public Quote API Types (unauthenticated endpoint)
// ============================================================================

export interface SmartMovingJobCharge {
  name: string              // e.g., "Travel Fee"
  totalCost: number
  chargeType: string
}

export interface SmartMovingJobFee {
  feeName: string
  amount: { estimated: number; quoted: number }
}

export interface SmartMovingPublicQuoteStop {
  address: { fullAddress: string }
  isOrigin: boolean
  isDestination: boolean
}

export interface SmartMovingPublicQuoteJob {
  id: string
  charges?: SmartMovingJobCharge[]
  estimatedCharges?: SmartMovingJobCharge[]
  fees?: SmartMovingJobFee[]
  stops?: SmartMovingPublicQuoteStop[]
}

export interface SmartMovingPublicQuote {
  id: string
  quoteNumber: number
  depositAmount: number
  customer: {
    name: string
    emailAddress: string
    phoneNumber?: string
  }
  jobs: SmartMovingPublicQuoteJob[]
}

// ============================================================================
// SmartMoving API Client
// ============================================================================

export class SmartMovingClient {
  private baseUrl = 'https://api-public.smartmoving.com/v1/api'
  private apiKey: string
  private clientId: string

  constructor(config: SmartMovingConfig) {
    if (!config.apiKey) {
      throw new Error('SmartMoving API key is required')
    }
    if (!config.clientId) {
      throw new Error('SmartMoving client ID is required')
    }

    this.apiKey = config.apiKey
    this.clientId = config.clientId
  }

  /**
   * Make authenticated request to SmartMoving API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers = {
      'x-api-key': this.apiKey,
      'x-client-id': this.clientId,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    logger.debug('SmartMoving API request', {
      url,
      method: options.method || 'GET',
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('SmartMoving API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url,
        })
        throw new Error(
          `SmartMoving API error: ${response.status} - ${errorText}`
        )
      }

      // Handle empty responses (204 No Content or empty body)
      const contentLength = response.headers.get('content-length')
      if (response.status === 204 || contentLength === '0') {
        return undefined as T
      }

      // Try to parse JSON, return undefined if empty
      const text = await response.text()
      if (!text || text.trim() === '') {
        return undefined as T
      }

      return JSON.parse(text) as T
    } catch (error) {
      logger.error('SmartMoving API request failed', {
        error: error instanceof Error ? error.message : String(error),
        url,
      })
      throw error
    }
  }

  /**
   * Retry logic wrapper for transient failures
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt < maxRetries) {
          logger.warn(`SmartMoving API retry ${attempt}/${maxRetries}`, {
            error: error instanceof Error ? error.message : String(error),
          })
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
    }

    throw lastError
  }

  /**
   * Get opportunity details by ID
   * GET /api/opportunities/{opportunityId}
   */
  async getOpportunity(opportunityId: string): Promise<SmartMovingOpportunity> {
    return this.retryRequest(async () => {
      logger.info('Getting SmartMoving opportunity', { opportunityId })

      const opportunity = await this.request<SmartMovingOpportunity>(
        `/opportunities/${opportunityId}`
      )

      logger.info('SmartMoving opportunity retrieved', {
        opportunityId,
        quoteNumber: opportunity.quoteNumber,
        status: opportunity.status,
        leadStatus: opportunity.leadStatus,
      })

      return opportunity
    })
  }

  /**
   * Search for opportunities by customer email
   * GET /api/leads?EmailAddress={email}
   */
  async searchOpportunityByEmail(
    email: string
  ): Promise<SmartMovingLeadSearchResult[]> {
    return this.retryRequest(async () => {
      logger.info('Searching SmartMoving by email', { email })

      const response = await this.request<SmartMovingPaginatedResponse<SmartMovingLeadSearchResult>>(
        `/leads?EmailAddress=${encodeURIComponent(email)}`
      )

      // Handle paginated response
      const results = response.pageResults || []

      logger.info('SmartMoving search results', {
        email,
        count: results.length,
        totalResults: response.totalResults
      })

      return results
    })
  }

  /**
   * Search for opportunity by quote number
   * The invoice ID in Kathy often corresponds to the SmartMoving quote number
   */
  async searchOpportunityByQuoteNumber(
    quoteNumber: string
  ): Promise<SmartMovingOpportunity | null> {
    return this.retryRequest(async () => {
      logger.info('Searching SmartMoving by quote number', { quoteNumber })

      // Get all leads (paginated response)
      const response = await this.request<SmartMovingPaginatedResponse<any>>('/leads')
      const leads = response.pageResults || []

      logger.info('Retrieved leads from SmartMoving', {
        totalResults: response.totalResults,
        thisPage: leads.length
      })

      const matchingLead = leads.find(
        (lead: any) => lead.quoteNumber === quoteNumber || lead.id === quoteNumber
      )

      if (!matchingLead) {
        logger.warn('No opportunity found for quote number', {
          quoteNumber,
          totalLeads: leads.length,
          sampleQuoteNumbers: leads.slice(0, 5).map((l: any) => l.quoteNumber).filter(Boolean)
        })
        return null
      }

      logger.info('Found matching lead', {
        quoteNumber,
        opportunityId: matchingLead.id,
        customerName: matchingLead.customerName
      })

      // Get full opportunity details
      return await this.getOpportunity(matchingLead.id)
    })
  }

  /**
   * Get jobs for an opportunity
   * GET /api/opportunities/{opportunityId}/jobs
   */
  async getOpportunityJobs(opportunityId: string): Promise<SmartMovingJob[]> {
    return this.retryRequest(async () => {
      logger.info('Getting SmartMoving jobs', { opportunityId })

      const jobs = await this.request<SmartMovingJob[]>(
        `/opportunities/${opportunityId}/jobs`
      )

      logger.info('SmartMoving jobs retrieved', {
        opportunityId,
        jobCount: jobs.length,
      })

      return jobs
    })
  }

  /**
   * Update job notes (accounting, customer, crew)
   * PATCH /api/premium/opportunities/{opportunityId}/jobs/{jobId}/notes
   */
  async updateJobNotes(
    opportunityId: string,
    jobId: string,
    notes: UpdateJobNotesParams
  ): Promise<void> {
    return this.retryRequest(async () => {
      logger.info('Updating SmartMoving job notes', {
        opportunityId,
        jobId,
        hasAccountingNotes: !!notes.accountingNotes,
        hasCustomerNotes: !!notes.customerNotes,
        hasCrewNotes: !!notes.crewNotes,
      })

      await this.request(
        `/premium/opportunities/${opportunityId}/jobs/${jobId}/notes`,
        {
          method: 'PATCH',
          body: JSON.stringify(notes),
        }
      )

      logger.info('SmartMoving job notes updated', {
        opportunityId,
        jobId,
      })
    })
  }

  /**
   * Confirm job with category
   * POST /api/premium/opportunities/{opportunityId}/jobs/{jobId}/confirm?category={category}
   */
  async confirmJob(
    opportunityId: string,
    jobId: string,
    category: string = 'deposit'
  ): Promise<void> {
    return this.retryRequest(async () => {
      logger.info('Confirming SmartMoving job', {
        opportunityId,
        jobId,
        category,
      })

      await this.request(
        `/premium/opportunities/${opportunityId}/jobs/${jobId}/confirm?category=${category}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )

      logger.info('SmartMoving job confirmed', {
        opportunityId,
        jobId,
        category,
      })
    })
  }

  /**
   * Get opportunity details by quote number
   * GET /api/opportunities/quote/{quoteNumber}
   * Includes charges and job addresses for payment page
   */
  async getOpportunityByQuoteNumber(quoteNumber: string): Promise<SmartMovingPublicQuote> {
    return this.retryRequest(async () => {
      logger.info('Getting SmartMoving opportunity by quote number', { quoteNumber })

      const data = await this.request<SmartMovingPublicQuote>(
        `/opportunities/quote/${quoteNumber}?IncludeCharges=true&IncludeJobAddresses=true`
      )

      logger.info('SmartMoving opportunity retrieved by quote number', {
        quoteNumber,
        customerName: data.customer?.name,
        depositAmount: data.depositAmount,
        jobCount: data.jobs?.length,
        hasCharges: data.jobs?.some(j => j.estimatedCharges?.length),
      })

      return data
    })
  }
}

// ============================================================================
// Quote Retrieval (requires authentication)
// ============================================================================

/**
 * Extract deposit amount from SmartMoving quote
 * Searches charges/fees for travel fee or falls back to depositAmount
 */
export function extractDepositAmount(
  quote: SmartMovingPublicQuote,
  fieldNames?: string[]
): { amount: number; source: string } {
  const defaults = ['Travel Fee', 'Trip Charge', 'Travel Charge', 'Fuel Fee']
  const names = fieldNames?.length ? fieldNames : defaults

  // Search charges first (both charges and estimatedCharges arrays)
  for (const job of quote.jobs || []) {
    // Check estimatedCharges array
    const estimatedCharge = job.estimatedCharges?.find(c =>
      names.some(n => c.name?.toLowerCase().includes(n.toLowerCase()))
    )
    if (estimatedCharge?.totalCost && estimatedCharge.totalCost > 0) {
      return { amount: estimatedCharge.totalCost, source: estimatedCharge.name }
    }

    // Check charges array
    const charge = job.charges?.find(c =>
      names.some(n => c.name?.toLowerCase().includes(n.toLowerCase()))
    )
    if (charge?.totalCost && charge.totalCost > 0) {
      return { amount: charge.totalCost, source: charge.name }
    }

    // Check fees array
    const fee = job.fees?.find(f =>
      names.some(n => f.feeName?.toLowerCase().includes(n.toLowerCase()))
    )
    if (fee?.amount?.estimated && fee.amount.estimated > 0) {
      return { amount: fee.amount.estimated, source: fee.feeName }
    }
  }

  // Fallback to depositAmount
  if (quote.depositAmount && quote.depositAmount > 0) {
    return { amount: quote.depositAmount, source: 'depositAmount' }
  }

  return { amount: 0, source: 'none' }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format payment note for SmartMoving accounting notes
 */
export function formatPaymentNote(params: {
  totalPaid: number
  transactionId?: string
  customerName?: string
  timestamp: Date
}): string {
  const date = params.timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const lines = [
    `Payment Received: $${params.totalPaid.toFixed(2)}`,
    `Date: ${date}`,
  ]

  if (params.transactionId) {
    lines.push(`Transaction ID: ${params.transactionId}`)
  }

  if (params.customerName) {
    lines.push(`Name: ${params.customerName}`)
  }

  return lines.join('\n')
}

/**
 * Calculate processing fee
 */
export function calculateProcessingFee(
  amount: number,
  feePercent: number = 2.75
): {
  estimateAmount: number
  feePercent: number
  feeAmount: number
  totalAmount: number
} {
  const feeAmount = Math.round(amount * (feePercent / 100) * 100) / 100
  const totalAmount = amount + feeAmount

  return {
    estimateAmount: amount,
    feePercent,
    feeAmount,
    totalAmount,
  }
}
