import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { createPaymentSession } from '@/lib/runpayments-real'
import { withAuth } from '@/lib/auth'
import type { CreatePaymentRequest, CreatePaymentResponse } from '@/lib/types'

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

    // Get organization name for display
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true }
    })

    logger.info('Creating payment session', {
      invoiceId: body.invoiceId,
      amount: body.amount,
      organizationId,
      organizationName: organization?.name,
      applicationName: body.applicationName,
      applicationConfigId: body.applicationConfigId
    })

    // Create payment session in database with application tracking
    const paymentSession = await prisma.paymentSession.create({
      data: {
        organizationId,
        userId: user?.id || body.userId,
        applicationConfigId: body.applicationConfigId,
        applicationName: body.applicationName || 'Practice Panther',
        invoiceId: body.invoiceId,
        amount: body.amount,
        currency: body.currency || 'USD',
        status: 'initiated',
        sourceUrl: body.sourceUrl,
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
      amount: body.amount,
      currency: body.currency || 'USD',
      invoiceId: compoundInvoiceId, // Use compound ID for multi-tenant isolation
      originalInvoiceId: body.invoiceId, // Original invoice ID for display
      paymentSessionId: paymentSession.id,
      description: `Invoice ${body.invoiceId} - ${organization?.name || body.applicationName || 'Payment'}`
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
          amount: body.amount,
          currency: body.currency || 'USD',
          applicationName: body.applicationName,
          sourceUrl: body.sourceUrl
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

