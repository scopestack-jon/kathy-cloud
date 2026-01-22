import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { createPaymentSession } from '@/lib/runpayments-real'
import { withAuth } from '@/lib/auth'
import { SmartMovingClient, calculateProcessingFee, type SmartMovingConfig } from '@/lib/smartmoving'

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

interface CreateFromSmartMovingRequest {
  opportunityId: string
  organizationId: string
}

/**
 * POST /api/payment-sessions/from-smartmoving
 * Create a pre-populated payment session from a SmartMoving opportunity
 */
async function handlePost(request: NextRequest) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    const body: CreateFromSmartMovingRequest = await request.json()

    // Validate required fields
    if (!body.opportunityId || !body.organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunityId, organizationId' },
        { status: 400, headers: corsHeaders }
      )
    }

    logger.info('Creating payment session from SmartMoving', {
      opportunityId: body.opportunityId,
      organizationId: body.organizationId,
      userId: user?.id
    })

    // Get organization with SmartMoving configuration
    const organization = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: {
        id: true,
        name: true,
        settings: true
      }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if SmartMoving is configured and enabled
    const settings = organization.settings as any
    const smartMovingConfig: SmartMovingConfig | undefined = settings?.smartMoving

    if (!smartMovingConfig?.enabled) {
      return NextResponse.json(
        { error: 'SmartMoving integration not enabled for this organization' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!smartMovingConfig.apiKey || !smartMovingConfig.clientId) {
      return NextResponse.json(
        { error: 'SmartMoving API credentials not configured' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize SmartMoving client
    const smartMoving = new SmartMovingClient(smartMovingConfig)

    // Fetch opportunity details from SmartMoving
    logger.info('Fetching SmartMoving opportunity', {
      opportunityId: body.opportunityId
    })

    const opportunity = await smartMoving.getOpportunity(body.opportunityId)

    // Validate opportunity has required data
    if (!opportunity.customer?.emailAddress) {
      return NextResponse.json(
        { error: 'SmartMoving opportunity missing customer email address' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get estimate amount
    const estimateAmount = opportunity.estimatedTotal?.finalTotal || opportunity.depositAmount || 0

    if (estimateAmount <= 0) {
      return NextResponse.json(
        { error: 'SmartMoving opportunity has no valid estimate amount' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Calculate processing fee
    const feePercent = smartMovingConfig.ccProcessingFeePercent || 2.75
    const feeCalculation = calculateProcessingFee(estimateAmount, feePercent)

    logger.info('Calculated processing fee', {
      estimateAmount: feeCalculation.estimateAmount,
      feePercent: feeCalculation.feePercent,
      feeAmount: feeCalculation.feeAmount,
      totalAmount: feeCalculation.totalAmount
    })

    // Create invoice ID from quote number or opportunity ID
    const invoiceId = opportunity.quoteNumber
      ? `SM-${opportunity.quoteNumber}`
      : `SM-${opportunity.id.substring(0, 8)}`

    // Create payment session in database
    const paymentSession = await prisma.paymentSession.create({
      data: {
        organizationId: body.organizationId,
        userId: user?.id || null,
        applicationName: 'SmartMoving',
        invoiceId: invoiceId,
        amount: feeCalculation.totalAmount,
        currency: 'USD',
        status: 'initiated',
        // Store SmartMoving metadata (will be used later for sync)
        // Note: PaymentSession model doesn't have metadata field in current schema
        // This will be added to update after payment is created
      }
    })

    // Create compound invoice ID for multi-tenant isolation
    const compoundInvoiceId = `${body.organizationId}:${invoiceId}`

    logger.info('Creating RunPayments session with pre-fill', {
      paymentSessionId: paymentSession.id,
      compoundInvoiceId,
      customerName: opportunity.customer.name,
      customerEmail: opportunity.customer.emailAddress,
      totalAmount: feeCalculation.totalAmount
    })

    // Create RunPayments hosted payment session with pre-filled customer data
    const runPaymentsSession = await createPaymentSession({
      amount: feeCalculation.totalAmount,
      currency: 'USD',
      invoiceId: compoundInvoiceId,
      originalInvoiceId: invoiceId,
      paymentSessionId: paymentSession.id,
      description: `Deposit for Quote #${opportunity.quoteNumber || opportunity.id} - ${organization.name}`,
      // Pre-fill customer data from SmartMoving
      customerName: opportunity.customer.name,
      customerEmail: opportunity.customer.emailAddress,
      customerPhone: opportunity.customer.phoneNumber,
      customerAddress: opportunity.customer.address ? {
        street: opportunity.customer.address.street,
        city: opportunity.customer.address.city,
        state: opportunity.customer.address.state,
        zip: opportunity.customer.address.zip
      } : undefined
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        paymentSessionId: paymentSession.id,
        userId: user?.id || null,
        action: 'payment_initiated_from_smartmoving',
        actor: user?.email || 'extension',
        metadata: {
          opportunityId: opportunity.id,
          quoteNumber: opportunity.quoteNumber,
          estimateAmount: feeCalculation.estimateAmount,
          processingFee: feeCalculation.feeAmount,
          totalAmount: feeCalculation.totalAmount,
          customerEmail: opportunity.customer.emailAddress,
          customerName: opportunity.customer.name,
          leadStatus: opportunity.leadStatus
        }
      }
    })

    logger.info('Payment session created from SmartMoving', {
      paymentSessionId: paymentSession.id,
      processorPaymentId: runPaymentsSession.id,
      opportunityId: opportunity.id,
      quoteNumber: opportunity.quoteNumber
    })

    return NextResponse.json({
      success: true,
      paymentSessionId: paymentSession.id,
      paymentUrl: runPaymentsSession.paymentUrl,
      feeBreakdown: {
        estimateAmount: feeCalculation.estimateAmount,
        processingFee: feeCalculation.feeAmount,
        feePercent: feeCalculation.feePercent,
        totalAmount: feeCalculation.totalAmount
      },
      customer: {
        name: opportunity.customer.name,
        email: opportunity.customer.emailAddress
      },
      opportunity: {
        id: opportunity.id,
        quoteNumber: opportunity.quoteNumber,
        status: opportunity.status,
        leadStatus: opportunity.leadStatus
      }
    }, { status: 201, headers: corsHeaders })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('Error creating payment session from SmartMoving', {
      message: errorMessage,
      stack: errorStack,
      error
    })

    return NextResponse.json(
      {
        error: 'Failed to create payment session from SmartMoving',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Export with authentication middleware
export const POST = withAuth(handlePost)
