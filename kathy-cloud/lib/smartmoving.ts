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
}

export interface UpdateJobNotesParams {
  accountingNotes?: string
  customerNotes?: string
  crewNotes?: string
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

      const data = await response.json()
      return data
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

      const results = await this.request<SmartMovingLeadSearchResult[]>(
        `/leads?EmailAddress=${encodeURIComponent(email)}`
      )

      logger.info('SmartMoving search results', {
        email,
        count: results.length,
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

      // Get all leads and find matching quote number
      const leads = await this.request<SmartMovingLeadSearchResult[]>('/leads')

      const matchingLead = leads.find(
        lead => lead.quoteNumber === quoteNumber || lead.id === quoteNumber
      )

      if (!matchingLead) {
        logger.info('No opportunity found for quote number', { quoteNumber })
        return null
      }

      logger.info('Found matching lead', {
        quoteNumber,
        opportunityId: matchingLead.id
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
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format payment note for SmartMoving accounting notes
 */
export function formatPaymentNote(params: {
  estimateAmount: number
  processingFee: number
  totalPaid: number
  quoteNumber?: string
  invoiceId: string
  processorId?: string
  customerEmail: string
  timestamp: Date
}): string {
  return `PAYMENT RECEIVED via Kathy
━━━━━━━━━━━━━━━━━━━━━━━━━━
Estimate Amount: $${params.estimateAmount.toFixed(2)}
Processing Fee: $${params.processingFee.toFixed(2)} (2.75%)
Total Paid: $${params.totalPaid.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
${params.quoteNumber ? `Quote #: ${params.quoteNumber}\n` : ''}Invoice: ${params.invoiceId}
${params.processorId ? `Gateway: ${params.processorId}\n` : ''}Date: ${params.timestamp.toISOString()}
Customer: ${params.customerEmail}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Processed via RunPayments integration
Auto-synced by Kathy Cloud`
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
