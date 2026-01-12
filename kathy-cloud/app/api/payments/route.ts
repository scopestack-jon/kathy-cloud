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
    const runPaymentsSession = await createPaymentSession({
      amount: body.amount,
      currency: body.currency || 'USD',
      invoiceId: compoundInvoiceId, // Use compound ID for multi-tenant isolation
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
    logger.error('Error creating payment session', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Export with authentication middleware
export const POST = withAuth(handlePost)

