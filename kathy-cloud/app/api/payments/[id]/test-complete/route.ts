import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { withAuth } from '@/lib/auth'
import { syncPaymentToSmartMoving } from '@/lib/smartmoving-sync'

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
 * POST /api/payments/[id]/test-complete
 * TESTING ONLY: Manually trigger payment completion
 * Simulates what would happen when a webhook is received
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
        { status: 400, headers: corsHeaders }
      )
    }

    logger.info('TEST: Manually completing payment', { paymentSessionId: id })

    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id }
    })

    if (!paymentSession) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    if (paymentSession.status === 'paid_pending_consent' || paymentSession.status === 'paid_and_confirmed') {
      return NextResponse.json(
        {
          message: 'Payment already marked as complete',
          status: paymentSession.status
        },
        { status: 200, headers: corsHeaders }
      )
    }

    // Update payment status
    await prisma.paymentSession.update({
      where: { id },
      data: { status: 'paid_pending_consent' }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        paymentSessionId: id,
        action: 'payment_captured',
        actor: 'test_endpoint',
        metadata: {
          previousStatus: paymentSession.status,
          newStatus: 'paid_pending_consent',
          note: 'Manually triggered via test endpoint'
        }
      }
    })

    logger.info('TEST: Payment status updated to paid_pending_consent', { paymentSessionId: id })

    // Trigger SmartMoving sync (non-blocking)
    syncPaymentToSmartMoving(id).catch(error => {
      logger.error('SmartMoving sync error (non-blocking)', {
        paymentSessionId: id,
        error: error instanceof Error ? error.message : String(error)
      })
    })

    return NextResponse.json(
      {
        message: 'Payment marked as complete',
        paymentSessionId: id,
        oldStatus: paymentSession.status,
        newStatus: 'paid_pending_consent',
        smartMovingSyncTriggered: true
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    logger.error('Error in test-complete endpoint', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Export with authentication middleware
export const POST = withAuth(handlePost)
