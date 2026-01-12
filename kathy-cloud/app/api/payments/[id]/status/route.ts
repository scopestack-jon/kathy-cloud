import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { withAuth } from '@/lib/auth'
import type { PaymentStatusResponse } from '@/lib/types'

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
 * GET /api/payments/[id]/status
 * Get payment session status (for polling)
 */
async function handleGet(
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

    logger.debug('Fetching payment session status', { paymentSessionId: id })

    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id }
    })

    if (!paymentSession) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const response: PaymentStatusResponse = {
      paymentSessionId: paymentSession.id,
      status: paymentSession.status,
      invoiceId: paymentSession.invoiceId,
      amount: parseFloat(paymentSession.amount.toString()),
      currency: paymentSession.currency,
      lastUpdatedAt: paymentSession.updatedAt.toISOString()
    }

    return NextResponse.json(response, { status: 200, headers: corsHeaders })

  } catch (error) {
    logger.error('Error fetching payment session status', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Export with authentication middleware
export const GET = withAuth(handleGet)





