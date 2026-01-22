import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { withAuth } from '@/lib/auth'
import type { PaymentStatusResponse } from '@/lib/types'
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
 * Check RunPayments API for payment status
 * Queries transactions API to find matching payment
 */
async function checkRunPaymentsStatus(paymentSession: any): Promise<string | null> {
  try {
    const apiKey = process.env.RUNPAYMENTS_API_KEY
    if (!apiKey) {
      logger.warn('RunPayments API key not configured')
      return null
    }

    // Query RunPayments transactions API
    // Search for transactions matching our payment session ID (stored in custom_02)
    const transactionsUrl = 'https://javelin.runpayments.io/api/v1/transactions'

    // Get recent transactions (last 24 hours)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const response = await fetch(
      `${transactionsUrl}?custom_02=${paymentSession.id}&since=${since}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      logger.warn('RunPayments API request failed', {
        status: response.status,
        paymentSessionId: paymentSession.id
      })
      return null
    }

    const data = await response.json()

    // Check if we have any captured/completed transactions
    const transactions = Array.isArray(data) ? data : (data.transactions || data.results || [])

    if (transactions.length > 0) {
      // Find a captured/completed transaction
      const capturedTx = transactions.find((tx: any) =>
        tx.status === 'captured' ||
        tx.status === 'completed' ||
        tx.status === 'approved' ||
        tx.state === 'captured' ||
        tx.state === 'completed'
      )

      if (capturedTx) {
        logger.info('Found captured transaction in RunPayments', {
          paymentSessionId: paymentSession.id,
          transactionId: capturedTx.id || capturedTx.transaction_id,
          status: capturedTx.status || capturedTx.state
        })
        return 'captured'
      }
    }

    return null
  } catch (error) {
    logger.error('Error checking RunPayments status', {
      paymentSessionId: paymentSession.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
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
      where: { id },
      include: { organization: true }
    })

    if (!paymentSession) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // If payment is still pending, check RunPayments for status updates
    if (paymentSession.status === 'pending' || paymentSession.status === 'initiated') {
      try {
        // Check RunPayments API for payment status
        const runpaymentsStatus = await checkRunPaymentsStatus(paymentSession)

        if (runpaymentsStatus === 'captured' || runpaymentsStatus === 'completed') {
          logger.info('Payment captured in RunPayments, updating status', {
            paymentSessionId: id,
            oldStatus: paymentSession.status,
            newStatus: 'paid_pending_consent'
          })

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
              actor: 'system',
              metadata: {
                previousStatus: paymentSession.status,
                newStatus: 'paid_pending_consent',
                detectedVia: 'polling'
              }
            }
          })

          // Trigger SmartMoving sync (non-blocking)
          syncPaymentToSmartMoving(id).catch(error => {
            logger.error('SmartMoving sync error (non-blocking)', {
              paymentSessionId: id,
              error: error instanceof Error ? error.message : String(error)
            })
          })

          // Return updated status
          const response: PaymentStatusResponse = {
            paymentSessionId: paymentSession.id,
            status: 'paid_pending_consent',
            invoiceId: paymentSession.invoiceId,
            amount: parseFloat(paymentSession.amount.toString()),
            currency: paymentSession.currency,
            lastUpdatedAt: new Date().toISOString()
          }

          return NextResponse.json(response, { status: 200, headers: corsHeaders })
        }
      } catch (error) {
        logger.error('Error checking RunPayments status', {
          paymentSessionId: id,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue with database status if RunPayments check fails
      }
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





