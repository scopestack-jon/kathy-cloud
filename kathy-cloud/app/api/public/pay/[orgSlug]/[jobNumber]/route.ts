import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { createPaymentSession } from '@/lib/runpayments-real'
import {
  getPublicQuote,
  extractDepositAmount,
  calculateProcessingFee,
  type SmartMovingConfig,
} from '@/lib/smartmoving'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

interface RouteParams {
  params: Promise<{
    orgSlug: string
    jobNumber: string
  }>
}

/**
 * POST /api/public/pay/[orgSlug]/[jobNumber]
 * Create a payment session from a SmartMoving quote (no auth required)
 * This is the customer-facing endpoint called from the payment page
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgSlug, jobNumber } = await params

  try {
    logger.info('Creating public payment session', { orgSlug, jobNumber })

    // Parse quote number from job number (e.g., "35493-1" → "35493")
    const quoteNumber = jobNumber.split('-')[0]

    if (!quoteNumber) {
      return NextResponse.json(
        { error: 'Invalid job number format' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get organization by slug
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check SmartMoving configuration
    const settings = organization.settings as Record<string, unknown> | null
    const smartMovingConfig = settings?.smartMoving as SmartMovingConfig | undefined

    if (!smartMovingConfig?.enabled) {
      return NextResponse.json(
        { error: 'Payment page not available for this organization' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Fetch quote from SmartMoving public API
    const quote = await getPublicQuote(quoteNumber)

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Extract deposit amount (travel fee)
    const depositFieldNames = smartMovingConfig.depositFieldNames
    const { amount: depositAmount, source: depositSource } = extractDepositAmount(
      quote,
      depositFieldNames
    )

    if (depositAmount <= 0) {
      return NextResponse.json(
        { error: 'No deposit amount found for this quote' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Calculate processing fee
    const feePercent = smartMovingConfig.ccProcessingFeePercent || 2.75
    const feeCalculation = calculateProcessingFee(depositAmount, feePercent)

    logger.info('Calculated payment amounts', {
      quoteNumber,
      depositAmount,
      depositSource,
      feePercent,
      feeAmount: feeCalculation.feeAmount,
      totalAmount: feeCalculation.totalAmount,
    })

    // Create invoice ID
    const invoiceId = `SM-${quoteNumber}-${jobNumber}`

    // Create payment session in database
    const paymentSession = await prisma.paymentSession.create({
      data: {
        organizationId: organization.id,
        applicationName: 'SmartMoving',
        invoiceId: invoiceId,
        amount: feeCalculation.totalAmount,
        currency: 'USD',
        status: 'initiated',
        metadata: {
          quoteNumber,
          jobNumber,
          depositAmount,
          depositSource,
          processingFee: feeCalculation.feeAmount,
          customerName: quote.customer?.name,
          customerEmail: quote.customer?.emailAddress,
          source: 'public_payment_page',
        },
      },
    })

    // Create compound invoice ID for multi-tenant isolation
    const compoundInvoiceId = `${organization.id}:${invoiceId}`

    // Create RunPayments hosted payment session
    const runPaymentsSession = await createPaymentSession({
      amount: feeCalculation.totalAmount,
      currency: 'USD',
      invoiceId: compoundInvoiceId,
      originalInvoiceId: invoiceId,
      paymentSessionId: paymentSession.id,
      description: `Deposit for Quote #${quoteNumber} - ${organization.name}`,
      customerName: quote.customer?.name,
      customerEmail: quote.customer?.emailAddress,
      customerPhone: quote.customer?.phoneNumber,
    })

    // Update payment session with processor details
    await prisma.paymentSession.update({
      where: { id: paymentSession.id },
      data: {
        processorPaymentId: runPaymentsSession.id,
        paymentUrl: runPaymentsSession.paymentUrl,
        status: 'pending',
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        paymentSessionId: paymentSession.id,
        action: 'payment_initiated_from_public_page',
        actor: 'customer',
        metadata: {
          quoteNumber,
          jobNumber,
          depositAmount,
          depositSource,
          processingFee: feeCalculation.feeAmount,
          totalAmount: feeCalculation.totalAmount,
          customerEmail: quote.customer?.emailAddress,
          customerName: quote.customer?.name,
        },
      },
    })

    logger.info('Public payment session created', {
      paymentSessionId: paymentSession.id,
      quoteNumber,
      jobNumber,
      totalAmount: feeCalculation.totalAmount,
    })

    return NextResponse.json(
      {
        success: true,
        paymentSessionId: paymentSession.id,
        paymentUrl: runPaymentsSession.paymentUrl,
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('Error creating public payment session', {
      orgSlug,
      jobNumber,
      error: errorMessage,
    })

    return NextResponse.json(
      {
        error: 'Failed to create payment session',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * GET /api/public/pay/[orgSlug]/[jobNumber]
 * Get quote details for the payment page (no auth required)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgSlug, jobNumber } = await params

  try {
    logger.info('Fetching public quote details', { orgSlug, jobNumber })

    // Parse quote number from job number
    const quoteNumber = jobNumber.split('-')[0]

    if (!quoteNumber) {
      return NextResponse.json(
        { error: 'Invalid job number format' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get organization by slug
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check SmartMoving configuration
    const settings = organization.settings as Record<string, unknown> | null
    const smartMovingConfig = settings?.smartMoving as SmartMovingConfig | undefined

    if (!smartMovingConfig?.enabled) {
      return NextResponse.json(
        { error: 'Payment page not available for this organization' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Fetch quote from SmartMoving public API
    const quote = await getPublicQuote(quoteNumber)

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Extract deposit amount
    const depositFieldNames = smartMovingConfig.depositFieldNames
    const { amount: depositAmount, source: depositSource } = extractDepositAmount(
      quote,
      depositFieldNames
    )

    // Calculate processing fee
    const feePercent = smartMovingConfig.ccProcessingFeePercent || 2.75
    const feeCalculation = calculateProcessingFee(depositAmount, feePercent)

    // Get origin and destination from stops
    let origin: string | undefined
    let destination: string | undefined

    for (const job of quote.jobs || []) {
      for (const stop of job.stops || []) {
        if (stop.isOrigin) {
          origin = stop.address?.fullAddress
        }
        if (stop.isDestination) {
          destination = stop.address?.fullAddress
        }
      }
    }

    return NextResponse.json(
      {
        organization: {
          name: organization.name,
        },
        quote: {
          quoteNumber: quote.quoteNumber,
          customer: {
            name: quote.customer?.name,
            email: quote.customer?.emailAddress,
          },
          origin,
          destination,
        },
        payment: {
          depositAmount,
          depositSource,
          processingFee: feeCalculation.feeAmount,
          feePercent: feeCalculation.feePercent,
          totalAmount: feeCalculation.totalAmount,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('Error fetching public quote details', {
      orgSlug,
      jobNumber,
      error: errorMessage,
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch quote details',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
