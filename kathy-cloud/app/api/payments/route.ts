import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { createPaymentSession } from '@/lib/runpayments-real'
import { withAuth } from '@/lib/auth'
import type { CreatePaymentRequest, CreatePaymentResponse } from '@/lib/types'
import { SmartMovingClient, calculateProcessingFee } from '@/lib/smartmoving'

// CORS headers for cross-origin requests from extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * POST /api/payments
 * Create a new payment session
 */
async function handlePost(request: NextRequest) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    const body: CreatePaymentRequest = await request.json()

    // Validate required fields
    if (!body.invoiceId || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, amount' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get organization ID from authenticated user or legacy firmId
    const organizationId = user?.organization_id || body.organizationName || body.firmId

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get organization with settings and application config
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, settings: true }
    })

    // Get application config to determine which integration to use
    const appConfig = body.applicationConfigId
      ? await prisma.applicationConfig.findUnique({
          where: { id: body.applicationConfigId }
        })
      : null

    // =====================================================================
    // APPLICATION-SPECIFIC INTEGRATIONS
    // =====================================================================
    // This section handles automatic customer data pre-fill and processing
    // fee calculation for supported applications. Each organization can have
    // multiple application configs (e.g., SmartMoving + Practice Panther),
    // and each will trigger the appropriate integration based on the
    // applicationName or sourceUrl.
    //
    // To add a new application integration:
    // 1. Add settings to organization.settings (e.g., organization.settings.myApp)
    // 2. Check applicationName or sourceUrl to detect the application
    // 3. Fetch customer data from the application's API
    // 4. Calculate final amount with any processing fees
    // 5. Store integration metadata in paymentSession.metadata
    // =====================================================================

    let customerData: { name?: string; email?: string; phone?: string } | undefined
    let finalAmount = body.amount
    let opportunityId: string | undefined
    let quoteNumber: string | undefined

    // ---------------------------------------------------------------------
    // SMARTMOVING INTEGRATION
    // ---------------------------------------------------------------------
    const smartMovingSettings = organization?.settings?.['smartMoving']
    const isSmartMovingApp = appConfig?.applicationName === 'SmartMoving' ||
                             body.applicationName === 'SmartMoving' ||
                             body.sourceUrl?.includes('smartmoving.com')

    if (isSmartMovingApp && smartMovingSettings?.enabled) {
      try {
        logger.info('SmartMoving integration: Detected SmartMoving request', {
          sourceUrl: body.sourceUrl,
          hasApiKey: !!smartMovingSettings.apiKey,
          hasClientId: !!smartMovingSettings.clientId
        })

        // Extract opportunity ID from SmartMoving URL
        // Format: https://app.smartmoving.com/opportunities/{opportunityId}/...
        const opportunityMatch = body.sourceUrl?.match(/\/opportunities\/([^\/]+)/)
        opportunityId = opportunityMatch?.[1]

        if (smartMovingSettings.apiKey && smartMovingSettings.clientId) {
          const smartMoving = new SmartMovingClient(
            smartMovingSettings.apiKey,
            smartMovingSettings.clientId
          )

          let opportunity: any = null

          if (opportunityId) {
            // Try fetching by opportunity ID from URL
            logger.info('SmartMoving integration: Fetching opportunity by ID', { opportunityId })
            try {
              opportunity = await smartMoving.getOpportunity(opportunityId)
            } catch (error) {
              logger.warn('Could not fetch opportunity by ID, will try by quote number', {
                opportunityId,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          }

          if (!opportunity && body.invoiceId) {
            // Fallback: Search by quote number (invoice ID)
            logger.info('SmartMoving integration: Searching by quote number', {
              quoteNumber: body.invoiceId
            })
            opportunity = await smartMoving.searchOpportunityByQuoteNumber(body.invoiceId)
          }

          if (!opportunity) {
            throw new Error('Could not find SmartMoving opportunity')
          }

          logger.info('SmartMoving integration: Opportunity found', {
            opportunityId: opportunity.id,
            quoteNumber: opportunity.quoteNumber
          })

          // Update opportunityId with the actual ID
          opportunityId = opportunity.id

          // Extract customer data
          customerData = {
            name: opportunity.customer?.name || undefined,
            email: opportunity.customer?.emailAddress || undefined,
            phone: opportunity.customer?.phoneNumber || undefined
          }

          quoteNumber = opportunity.quoteNumber

          // Calculate total with processing fee
          const feePercent = smartMovingSettings.ccProcessingFeePercent || 2.75
          const feeCalc = calculateProcessingFee(body.amount, feePercent)
          finalAmount = feeCalc.totalAmount

          logger.info('SmartMoving integration: Customer data fetched', {
            opportunityId,
            quoteNumber,
            customerName: customerData.name,
            customerEmail: customerData.email,
            estimateAmount: body.amount,
            processingFee: feeCalc.feeAmount,
            totalAmount: finalAmount
          })

          // Create audit log for SmartMoving fetch
          await prisma.auditLog.create({
            data: {
              organizationId,
              userId: user?.id || null,
              action: 'smartmoving_customer_fetch',
              actor: user?.email || 'extension',
              metadata: {
                opportunityId,
                quoteNumber,
                customerEmail: customerData.email,
                estimateAmount: body.amount,
                processingFee: feeCalc.feeAmount,
                totalAmount: finalAmount
              }
            }
          })
        } else {
          logger.warn('SmartMoving integration: Missing opportunity ID or credentials', {
            hasOpportunityId: !!opportunityId,
            hasApiKey: !!smartMovingSettings.apiKey,
            hasClientId: !!smartMovingSettings.clientId
          })
        }
      } catch (error) {
        // Non-blocking: log error but continue with payment creation
        logger.error('SmartMoving integration: Error fetching customer data (non-blocking)', {
          error: error instanceof Error ? error.message : String(error),
          opportunityId
        })

        await prisma.auditLog.create({
          data: {
            organizationId,
            userId: user?.id || null,
            action: 'smartmoving_customer_fetch_failed',
            actor: user?.email || 'extension',
            metadata: {
              opportunityId,
              error: error instanceof Error ? error.message : String(error),
              sourceUrl: body.sourceUrl
            }
          }
        })
      }
    }

    // ---------------------------------------------------------------------
    // ADD MORE APPLICATION INTEGRATIONS HERE
    // Example:
    // const practicePantherSettings = organization?.settings?.['practicePanther']
    // const isPracticePantherApp = appConfig?.applicationName === 'Practice Panther' || ...
    // if (isPracticePantherApp && practicePantherSettings?.enabled) { ... }
    // ---------------------------------------------------------------------

    logger.info('Creating payment session', {
      invoiceId: body.invoiceId,
      amount: finalAmount,
      originalAmount: body.amount,
      organizationId,
      organizationName: organization?.name,
      applicationName: body.applicationName,
      applicationConfigId: body.applicationConfigId,
      hasCustomerData: !!customerData,
      opportunityId,
      quoteNumber
    })

    // Create payment session in database with application tracking
    const paymentSession = await prisma.paymentSession.create({
      data: {
        organizationId,
        userId: user?.id || body.userId,
        applicationConfigId: body.applicationConfigId,
        applicationName: body.applicationName || 'Practice Panther',
        invoiceId: body.invoiceId,
        amount: finalAmount, // Use final amount (includes processing fee if SmartMoving)
        currency: body.currency || 'USD',
        status: 'initiated',
        sourceUrl: body.sourceUrl,
        metadata: opportunityId ? {
          smartMoving: {
            opportunityId,
            quoteNumber,
            estimateAmount: body.amount,
            processingFeeAmount: finalAmount - body.amount,
            customerEmail: customerData?.email
          }
        } : undefined,
        // Legacy fields for backward compatibility
        practicePantherInvoiceUrl: body.practicePantherInvoiceUrl,
        firmId: organization?.name || body.firmId
      }
    })

    // Create compound invoice ID for multi-tenant isolation
    // Format: {organizationId}:{invoiceId}
    // This ensures Organization A's "I-123" is different from Organization B's "I-123"
    const compoundInvoiceId = `${organizationId}:${body.invoiceId}`

    logger.info('Creating payment with compound invoice ID', {
      originalInvoiceId: body.invoiceId,
      compoundInvoiceId,
      organizationId,
      organizationName: organization?.name,
      applicationName: body.applicationName
    })
    
    // Create RunPayments hosted payment session
    logger.info('Calling createPaymentSession', {
      amount: body.amount,
      currency: body.currency || 'USD',
      invoiceId: compoundInvoiceId,
      paymentSessionId: paymentSession.id,
      hasApiKey: !!process.env.RUNPAYMENTS_API_KEY,
      hasCcMid: !!process.env.RUNPAYMENTS_CC_MID,
      hasRefreshToken: !!process.env.RUNPAYMENTS_REFRESH_TOKEN,
      mode: process.env.RUNPAYMENTS_MODE
    })
    
    const runPaymentsSession = await createPaymentSession({
      amount: finalAmount, // Use final amount (includes processing fee if applicable)
      currency: body.currency || 'USD',
      invoiceId: compoundInvoiceId, // Use compound ID for multi-tenant isolation
      originalInvoiceId: body.invoiceId, // Original invoice ID for display
      paymentSessionId: paymentSession.id,
      description: quoteNumber
        ? `Quote #${quoteNumber} - ${organization?.name || body.applicationName || 'Payment'}`
        : `Invoice ${body.invoiceId} - ${organization?.name || body.applicationName || 'Payment'}`,
      // Pre-fill customer data if available from integration
      customerName: customerData?.name,
      customerEmail: customerData?.email,
      customerPhone: customerData?.phone
    })

    // Update payment session with processor details
    await prisma.paymentSession.update({
      where: { id: paymentSession.id },
      data: {
        processorPaymentId: runPaymentsSession.id,
        paymentUrl: runPaymentsSession.paymentUrl,
        status: 'pending'
      }
    })

    // Create audit log with user tracking
    await prisma.auditLog.create({
      data: {
        paymentSessionId: paymentSession.id,
        userId: user?.id || null,
        action: 'payment_initiated',
        actor: user?.email || body.userId || 'extension',
        metadata: {
          invoiceId: body.invoiceId,
          amount: finalAmount,
          originalAmount: body.amount !== finalAmount ? body.amount : undefined,
          currency: body.currency || 'USD',
          applicationName: body.applicationName,
          sourceUrl: body.sourceUrl,
          hasCustomerData: !!customerData,
          opportunityId,
          quoteNumber
        }
      }
    })

    logger.info('Payment session created successfully', {
      paymentSessionId: paymentSession.id,
      processorPaymentId: runPaymentsSession.id,
      applicationName: body.applicationName
    })

    const response: CreatePaymentResponse = {
      paymentSessionId: paymentSession.id,
      paymentUrl: runPaymentsSession.paymentUrl
    }

    return NextResponse.json(response, { status: 201, headers: corsHeaders })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error('Error creating payment session', {
      message: errorMessage,
      stack: errorStack,
      error
    })
    
    // Temporarily expose all error details for debugging
    const errorResponse = { 
      error: 'Internal server error',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      debugInfo: {
        nodeEnv: process.env.NODE_ENV,
        debugFlag: process.env.DEBUG,
        hasApiKey: !!process.env.RUNPAYMENTS_API_KEY,
        hasCcMid: !!process.env.RUNPAYMENTS_CC_MID,
        hasRefreshToken: !!process.env.RUNPAYMENTS_REFRESH_TOKEN,
        mode: process.env.RUNPAYMENTS_MODE,
        apiKeyPrefix: process.env.RUNPAYMENTS_API_KEY?.substring(0, 10) + '...' || 'missing',
        ccMidPrefix: process.env.RUNPAYMENTS_CC_MID?.substring(0, 10) + '...' || 'missing'
      }
    }
    
    logger.error('Returning error response to client', {
      errorMessage,
      hasDetails: !!errorResponse.details,
      debugInfo: errorResponse.debugInfo
    })
    
    return NextResponse.json(
      errorResponse,
      { status: 500, headers: corsHeaders }
    )
  }
}

// Export with authentication middleware
export const POST = withAuth(handlePost)

