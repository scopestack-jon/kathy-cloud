import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { verifyWebhookSignature } from '@/lib/runpayments-real'
import { syncPaymentToSmartMoving } from '@/lib/smartmoving-sync'
import type { WebhookEvent } from '@/lib/types'

/**
 * POST /api/webhooks/payment
 * Handle payment processor webhooks
 * No authentication middleware - uses signature verification instead
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-runpayments-signature') || ''
    const payload = await request.text()

    // Verify webhook signature
    const webhookSecret = process.env.RUNPAYMENTS_WEBHOOK_SECRET || ''
    logger.info('Verifying webhook signature', { 
      hasSignature: !!signature,
      signatureLength: signature.length,
      hasWebhookSecret: !!webhookSecret
    })
    
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      logger.warn('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    logger.info('Webhook signature verified successfully')

    const event: any = JSON.parse(payload)
    logger.info('Received webhook event', { 
      type: event.type, 
      id: event.id, 
      event: event.event,
      subType: event.subType,
      fullEvent: event 
    })

    // Extract invoice number from RunPayments webhook
    // New format: custom_01 contains compound ID, invoice_number contains display ID
    // Legacy format: invoice_number contains compound ID
    const custom01 = event.data?.transaction?.transaction_details?.custom_01
    const invoiceNumber = event.data?.transaction?.transaction_details?.invoice_number
    
    // Try custom_01 first (new format), fallback to invoice_number (legacy)
    const compoundInvoiceId = custom01 || invoiceNumber
    
    // Parse compound invoice ID to extract organization and invoice
    let organizationId: string | null = null
    let invoiceId: string | null = null
    
    if (compoundInvoiceId && compoundInvoiceId.includes(':')) {
      const parts = compoundInvoiceId.split(':', 2)
      organizationId = parts[0]
      invoiceId = parts[1]
    } else if (compoundInvoiceId) {
      // No organization prefix (single tenant or original invoice ID)
      invoiceId = compoundInvoiceId
    }
    
    logger.info('Webhook invoice lookup', { 
      compoundInvoiceId,
      organizationId,
      invoiceId,
      eventId: event.id,
      hasTransactionData: !!event.data?.transaction
    })

    // Try to find payment session by invoice number + organization (multi-tenant safe)
    let paymentSession = null
    if (invoiceId && organizationId) {
      // Preferred: Match both invoice AND organization for multi-tenant isolation
      paymentSession = await prisma.paymentSession.findFirst({
        where: { 
          invoiceId: invoiceId,
          firmId: organizationId,
          status: { in: ['pending', 'initiated'] }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      logger.info('Multi-tenant lookup result', { 
        found: !!paymentSession,
        invoiceId,
        organizationId
      })
    } else if (invoiceId) {
      // Fallback: Match only invoice (for legacy or un-configured sessions)
      paymentSession = await prisma.paymentSession.findFirst({
        where: { 
          invoiceId: invoiceId,
          status: { in: ['pending', 'initiated'] }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      logger.warn('Single-tenant lookup (no organization isolation)', { 
        found: !!paymentSession,
        invoiceId
      })
    }

    // Fallback: Try by processor payment ID
    if (!paymentSession && event.id) {
      paymentSession = await prisma.paymentSession.findFirst({
        where: { processorPaymentId: event.id }
      })
    }

    // Fallback: Try by metadata if available
    if (!paymentSession && event.data?.metadata?.paymentSessionId) {
      paymentSession = await prisma.paymentSession.findUnique({
        where: { id: event.data.metadata.paymentSessionId }
      })
    }

    if (!paymentSession) {
      logger.warn('Payment session not found for webhook', {
        eventId: event.id,
        eventType: event.type,
        metadata: event.metadata || event.data?.metadata
      })
      // Return 200 to prevent retries
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Check if event already processed (idempotency)
    // Note: Simplified check without JSON path query due to Prisma limitations
    const existingLog = await prisma.auditLog.findFirst({
      where: {
        paymentSessionId: paymentSession.id,
        action: 'webhook_received'
      },
      orderBy: { timestamp: 'desc' }
    })
    
    // Check if the event ID matches (manual check since JSON path queries are complex)
    if (existingLog && existingLog.metadata && 
        typeof existingLog.metadata === 'object' && 
        'event_id' in existingLog.metadata &&
        (existingLog.metadata as any).event_id === event.id) {
      logger.info('Webhook event already processed', { eventId: event.id })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (existingLog) {
      logger.info('Webhook event already processed', { eventId: event.id })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle different event types
    // RunPayments format: { event: "transaction", type: "succeeded", subType: "charge" }
    let newStatus: 'paid_pending_consent' | 'failed' | null = null

    const eventType = event.type || ''
    const eventName = event.event || ''
    const subType = event.subType || ''
    
    // Check for success
    if (eventType === 'succeeded' || 
        eventName === 'transaction' && eventType === 'succeeded' ||
        eventType === 'payment.succeeded' ||
        eventType === 'payment_succeeded' ||
        eventType === 'charge.succeeded') {
      newStatus = 'paid_pending_consent'
      logger.info('Payment succeeded', {
        paymentSessionId: paymentSession.id,
        processorPaymentId: event.id || event.data?.transaction?.id
      })
    }
    // Check for failure
    else if (eventType === 'failed' ||
             eventType === 'payment.failed' ||
             eventType === 'payment_failed' ||
             eventType === 'charge.failed') {
      newStatus = 'failed'
      logger.warn('Payment failed', {
        paymentSessionId: paymentSession.id,
        processorPaymentId: event.id
      })
    }
    else {
      logger.info('Unhandled webhook event type', { 
        type: eventType, 
        event: eventName,
        subType: subType 
      })
      // Still log the event but don't change status
    }

    // Update payment session status if applicable
    if (newStatus) {
      // Extract processor payment ID from various locations in the payload
      const processorPaymentId = event.id || 
                                  event.data?.transaction?.id?.toString() || 
                                  event.data?.reference_number?.toString() ||
                                  paymentSession.processorPaymentId
      
      await prisma.paymentSession.update({
        where: { id: paymentSession.id },
        data: { 
          status: newStatus,
          processorPaymentId: processorPaymentId
        }
      })
    }

    // Create audit log for webhook
    await prisma.auditLog.create({
      data: {
        paymentSessionId: paymentSession.id,
        action: 'webhook_received',
        actor: 'system:runpayments',
        metadata: {
          event_id: event.id,
          event_type: event.type,
          processor_payment_id: event.id,
          amount: event.amount || event.data?.amount,
          new_status: newStatus,
          raw_event: event
        }
      }
    })

    // Sync to SmartMoving if payment succeeded
    // Non-blocking - run in background, don't wait for completion
    if (newStatus === 'paid_pending_consent') {
      logger.info('Triggering SmartMoving sync', {
        paymentSessionId: paymentSession.id
      })

      // Fire and forget - don't await
      syncPaymentToSmartMoving(paymentSession.id).catch((error) => {
        logger.error('SmartMoving sync error (non-blocking)', {
          paymentSessionId: paymentSession.id,
          error: error instanceof Error ? error.message : String(error)
        })
      })
    }

    logger.info('Webhook processed successfully', {
      paymentSessionId: paymentSession.id,
      eventType: event.type,
      newStatus
    })

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    logger.error('Error processing webhook', error)
    // Return 500 to trigger retry from payment processor
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

