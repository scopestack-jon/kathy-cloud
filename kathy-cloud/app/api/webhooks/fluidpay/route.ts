import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { verifyFluidPayWebhookSignature, type FluidPayWebhookEvent } from '@/lib/fluidpay'
import { syncPaymentToSmartMoving } from '@/lib/smartmoving-sync'

/**
 * POST /api/webhooks/fluidpay
 * Handle FluidPay webhook events
 * No authentication middleware - uses signature verification instead
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('Signature') || ''
    const payload = await request.text()

    // Verify webhook signature
    const webhookSecret = process.env.FLUIDPAY_WEBHOOK_SECRET || ''

    logger.info('Received FluidPay webhook', {
      hasSignature: !!signature,
      signatureLength: signature.length,
      hasWebhookSecret: !!webhookSecret,
    })

    // Skip verification if no secret configured (development only)
    const skipVerification = process.env.SKIP_WEBHOOK_VERIFICATION === 'true'

    if (!skipVerification && webhookSecret) {
      if (!verifyFluidPayWebhookSignature(payload, signature, webhookSecret)) {
        logger.warn('Invalid FluidPay webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
      logger.info('FluidPay webhook signature verified successfully')
    } else if (!skipVerification && !webhookSecret) {
      logger.warn('FluidPay webhook secret not configured - skipping signature verification')
    }

    const event: FluidPayWebhookEvent = JSON.parse(payload)

    logger.info('Received FluidPay webhook event', {
      type: event.type,
      status: event.status,
      transactionId: event.data?.id,
      transactionStatus: event.data?.status,
      amount: event.data?.amount,
    })

    // Extract reference information from transaction data
    // FluidPay stores our invoice ID in order_id or po_number (Invoice API)
    // SPP transactions pass PaymentSession ID via custom_fields
    const orderId = event.data?.order_id
    const poNumber = event.data?.po_number
    const customFields = event.data?.custom_fields
    const invoiceNumber = orderId || poNumber

    // Extract PaymentSession ID from custom_fields (SPP transactions)
    // Custom fields values may contain our PaymentSession UUID
    let customFieldsReferenceId: string | undefined
    if (customFields && typeof customFields === 'object') {
      logger.info('FluidPay webhook custom_fields content', {
        customFields: JSON.stringify(customFields),
        keys: Object.keys(customFields),
      })

      // Look for a UUID pattern in custom_fields values
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      for (const [key, value] of Object.entries(customFields)) {
        logger.debug('Checking custom field', { key, value, type: typeof value })
        if (typeof value === 'string' && uuidPattern.test(value)) {
          customFieldsReferenceId = value
          break
        }
      }
    }

    logger.info('FluidPay webhook invoice lookup', {
      orderId,
      poNumber,
      invoiceNumber,
      customFieldsReferenceId,
      hasCustomFields: !!customFields,
      transactionId: event.data?.id,
    })

    // Try to find payment session by various methods
    let paymentSession = null

    // Method 1: Try by PaymentSession ID from custom_fields (SPP)
    if (customFieldsReferenceId) {
      paymentSession = await prisma.paymentSession.findUnique({
        where: { id: customFieldsReferenceId },
      })

      logger.info('Custom fields reference lookup result', {
        found: !!paymentSession,
        customFieldsReferenceId,
      })
    }

    // Method 2: Try by invoice number (Invoice API)
    if (!paymentSession && invoiceNumber) {
      paymentSession = await prisma.paymentSession.findFirst({
        where: {
          invoiceId: invoiceNumber,
          status: { in: ['pending', 'initiated'] },
        },
        orderBy: { createdAt: 'desc' },
      })

      logger.info('Invoice lookup result', {
        found: !!paymentSession,
        invoiceNumber,
      })
    }

    // Method 3: Fallback - Try by processor payment ID (FluidPay invoice/transaction ID)
    if (!paymentSession && event.data?.id) {
      paymentSession = await prisma.paymentSession.findFirst({
        where: { processorPaymentId: event.data.id },
      })

      logger.info('Processor ID lookup result', {
        found: !!paymentSession,
        processorPaymentId: event.data.id,
      })
    }

    if (!paymentSession) {
      logger.warn('Payment session not found for FluidPay webhook', {
        eventType: event.type,
        transactionId: event.data?.id,
        invoiceNumber,
      })
      // Return 200 to prevent retries
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Check if event already processed (idempotency)
    const existingLog = await prisma.auditLog.findFirst({
      where: {
        paymentSessionId: paymentSession.id,
        action: 'fluidpay_webhook_received',
      },
      orderBy: { timestamp: 'desc' },
    })

    // Check if this specific transaction ID was already processed
    if (existingLog?.metadata &&
        typeof existingLog.metadata === 'object' &&
        'transaction_id' in existingLog.metadata &&
        (existingLog.metadata as Record<string, unknown>).transaction_id === event.data?.id) {
      logger.info('FluidPay webhook event already processed', {
        transactionId: event.data?.id,
      })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle different event types
    let newStatus: 'paid_pending_consent' | 'failed' | null = null
    const transactionStatus = event.data?.status?.toLowerCase()

    // FluidPay transaction statuses:
    // - pending: Transaction initiated
    // - settled: Payment completed successfully
    // - declined: Payment was declined
    // - voided: Transaction was voided
    // - refunded: Transaction was refunded

    // Check event type and transaction status
    if (event.type === 'transaction_settlement' ||
        event.type === 'transaction_update' && transactionStatus === 'settled' ||
        transactionStatus === 'settled') {
      newStatus = 'paid_pending_consent'
      logger.info('FluidPay payment succeeded', {
        paymentSessionId: paymentSession.id,
        transactionId: event.data?.id,
        amount: event.data?.amount,
      })
    } else if (transactionStatus === 'declined' ||
               transactionStatus === 'voided' ||
               transactionStatus === 'failed') {
      newStatus = 'failed'
      logger.warn('FluidPay payment failed', {
        paymentSessionId: paymentSession.id,
        transactionId: event.data?.id,
        status: transactionStatus,
      })
    } else {
      logger.info('Unhandled FluidPay webhook event type', {
        type: event.type,
        transactionStatus,
      })
    }

    // Update payment session status if applicable
    if (newStatus) {
      await prisma.paymentSession.update({
        where: { id: paymentSession.id },
        data: {
          status: newStatus,
          processorPaymentId: event.data?.id || paymentSession.processorPaymentId,
        },
      })
    }

    // Extract customer info from webhook
    let customerName: string | undefined
    if (event.data?.response?.card?.card_holder) {
      customerName = event.data.response.card.card_holder
    } else if (event.data?.billing_address?.first_name || event.data?.billing_address?.last_name) {
      customerName = `${event.data.billing_address?.first_name || ''} ${event.data.billing_address?.last_name || ''}`.trim()
    }

    // Create audit log for webhook
    await prisma.auditLog.create({
      data: {
        paymentSessionId: paymentSession.id,
        action: 'fluidpay_webhook_received',
        actor: 'system:fluidpay',
        metadata: {
          transaction_id: event.data?.id,
          event_type: event.type,
          transaction_status: transactionStatus,
          amount: event.data?.amount,
          customer_name: customerName,
          new_status: newStatus,
          custom_fields_reference: customFieldsReferenceId,
          lookup_method: customFieldsReferenceId ? 'custom_fields' : (invoiceNumber ? 'invoice_number' : 'processor_id'),
          raw_event: JSON.parse(JSON.stringify(event)),  // Convert to plain object for Prisma
        },
      },
    })

    // Sync to SmartMoving if payment succeeded
    if (newStatus === 'paid_pending_consent') {
      logger.info('Triggering SmartMoving sync for FluidPay payment', {
        paymentSessionId: paymentSession.id,
      })

      // Fire and forget - don't await
      syncPaymentToSmartMoving(paymentSession.id).catch((error) => {
        logger.error('SmartMoving sync error (non-blocking)', {
          paymentSessionId: paymentSession.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }

    logger.info('FluidPay webhook processed successfully', {
      paymentSessionId: paymentSession.id,
      eventType: event.type,
      newStatus,
    })

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    logger.error('Error processing FluidPay webhook', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Return 500 to trigger retry from FluidPay
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
