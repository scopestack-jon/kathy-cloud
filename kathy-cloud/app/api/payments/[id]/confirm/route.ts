import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { withAuth } from '@/lib/auth'
import type { ConfirmPaymentResponse } from '@/lib/types'

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
 * POST /api/payments/[id]/confirm
 * Confirm that invoice should be marked as paid
 * Requires payment session to be in 'paid_pending_consent' status
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Payment session ID is required' },
        { status: 400 }
      )
    }

    logger.info('Processing payment confirmation', { paymentSessionId: id })

    // Get payment session
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id }
    })

    if (!paymentSession) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404 }
      )
    }

    // Verify status is paid_pending_consent
    if (paymentSession.status !== 'paid_pending_consent') {
      return NextResponse.json(
        {
          error: 'Payment session must be in paid_pending_consent status',
          currentStatus: paymentSession.status
        },
        { status: 400 }
      )
    }

    // Update payment session to confirmed
    await prisma.paymentSession.update({
      where: { id },
      data: { status: 'paid_and_confirmed' }
    })

    // Create audit log for mark_paid action
    await prisma.auditLog.create({
      data: {
        paymentSessionId: id,
        action: 'mark_paid',
        actor: paymentSession.userId || 'extension',
        metadata: {
          invoiceId: paymentSession.invoiceId,
          amount: parseFloat(paymentSession.amount.toString()),
          currency: paymentSession.currency,
          timestamp: new Date().toISOString(),
          source: 'extension'
        }
      }
    })

    logger.info('Payment confirmed successfully', {
      paymentSessionId: id,
      invoiceId: paymentSession.invoiceId
    })

    const response: ConfirmPaymentResponse = {
      success: true,
      message: 'Payment confirmed and invoice marked as paid'
    }

    return NextResponse.json(response, { status: 200, headers: corsHeaders })

  } catch (error) {
    logger.error('Error confirming payment', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Export with authentication middleware
export const POST = withAuth(handlePost)





