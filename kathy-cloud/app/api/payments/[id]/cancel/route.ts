import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { withAuth } from '@/lib/auth'
import type { ConfirmPaymentResponse } from '@/lib/types'

/**
 * POST /api/payments/[id]/cancel
 * Cancel/decline the invoice marking after payment
 * Payment stays in Kathy dashboard for manual handling
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

    logger.info('Processing payment cancellation', { paymentSessionId: id })

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

    // Can cancel from paid_pending_consent or pending
    if (paymentSession.status !== 'paid_pending_consent' && paymentSession.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Can only cancel payments in paid_pending_consent or pending status',
          currentStatus: paymentSession.status
        },
        { status: 400 }
      )
    }

    // Update payment session to manual_review
    await prisma.paymentSession.update({
      where: { id },
      data: { status: 'manual_review' }
    })

    // Create audit log for cancel action
    await prisma.auditLog.create({
      data: {
        paymentSessionId: id,
        action: 'cancel_after_payment',
        actor: paymentSession.userId || 'extension',
        metadata: {
          invoiceId: paymentSession.invoiceId,
          amount: parseFloat(paymentSession.amount.toString()),
          currency: paymentSession.currency,
          reason: 'user_declined_consent',
          timestamp: new Date().toISOString(),
          source: 'extension'
        }
      }
    })

    logger.info('Payment cancelled, moved to manual review', {
      paymentSessionId: id,
      invoiceId: paymentSession.invoiceId
    })

    const response: ConfirmPaymentResponse = {
      success: true,
      message: 'Payment cancelled and moved to manual review'
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    logger.error('Error cancelling payment', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export with authentication middleware
export const POST = withAuth(handlePost)





