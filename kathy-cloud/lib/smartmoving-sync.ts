// SmartMoving payment sync helper functions
import logger from './logger'
import prisma from './prisma'
import { SmartMovingClient, formatPaymentNote, type SmartMovingConfig } from './smartmoving'

/**
 * Sync payment to SmartMoving opportunity
 * This is called after a payment is confirmed (webhook or manual)
 */
export async function syncPaymentToSmartMoving(paymentSessionId: string): Promise<void> {
  try {
    logger.info('Starting SmartMoving sync', { paymentSessionId })

    // Get payment session with organization
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id: paymentSessionId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        },
        auditLogs: {
          where: {
            action: 'payment_initiated_from_smartmoving'
          },
          take: 1,
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    if (!paymentSession) {
      logger.warn('Payment session not found for SmartMoving sync', { paymentSessionId })
      return
    }

    // Check if organization has SmartMoving configured
    const settings = paymentSession.organization.settings as any
    const smartMovingConfig: SmartMovingConfig | undefined = settings?.smartMoving

    if (!smartMovingConfig?.enabled) {
      logger.debug('SmartMoving not enabled for organization', {
        paymentSessionId,
        organizationId: paymentSession.organizationId
      })
      return
    }

    if (!smartMovingConfig.apiKey || !smartMovingConfig.clientId) {
      await createAuditLog(paymentSessionId, 'smartmoving_config_missing', {
        error: 'Missing API credentials'
      })
      logger.warn('SmartMoving API credentials not configured', {
        paymentSessionId,
        organizationId: paymentSession.organizationId
      })
      return
    }

    // Initialize SmartMoving client
    const smartMoving = new SmartMovingClient(smartMovingConfig)

    // Get opportunity ID from audit log or search by email
    let opportunityId: string | null = null
    let quoteNumber: string | null = null
    let customerEmail: string | null = null

    // Try to get from audit log (if payment was initiated from SmartMoving)
    if (paymentSession.auditLogs.length > 0) {
      const initLog = paymentSession.auditLogs[0]
      const metadata = initLog.metadata as any
      opportunityId = metadata?.opportunityId
      quoteNumber = metadata?.quoteNumber
      customerEmail = metadata?.customerEmail

      logger.info('Found SmartMoving opportunity from audit log', {
        opportunityId,
        quoteNumber,
        customerEmail
      })
    }

    // If no opportunity ID, try to extract customer email from webhook data
    if (!opportunityId) {
      // Check recent webhook audit logs for customer email
      const webhookLog = await prisma.auditLog.findFirst({
        where: {
          paymentSessionId: paymentSessionId,
          action: 'webhook_received'
        },
        orderBy: { timestamp: 'desc' }
      })

      if (webhookLog && webhookLog.metadata) {
        const webhookData = webhookLog.metadata as any
        customerEmail = webhookData.raw_event?.data?.transaction?.transaction_details?.email
      }

      if (customerEmail) {
        logger.info('Searching SmartMoving by customer email', { customerEmail })

        // Search for opportunity by email
        const opportunities = await smartMoving.searchOpportunityByEmail(customerEmail)

        if (opportunities.length === 0) {
          await createAuditLog(paymentSessionId, 'smartmoving_opportunity_not_found', {
            customerEmail,
            searchMethod: 'email'
          })
          logger.info('No SmartMoving opportunities found for customer', { customerEmail })
          return
        }

        // Use most recent opportunity
        opportunityId = opportunities[0].id
        logger.info('Found SmartMoving opportunity by email', {
          opportunityId,
          customerEmail,
          count: opportunities.length
        })
      } else {
        logger.info('No customer email available for SmartMoving search', {
          paymentSessionId
        })
        return
      }
    }

    if (!opportunityId) {
      logger.warn('Could not determine SmartMoving opportunity ID', { paymentSessionId })
      return
    }

    await createAuditLog(paymentSessionId, 'smartmoving_sync_started', {
      opportunityId,
      quoteNumber,
      customerEmail
    })

    const syncStartTime = Date.now()

    // Get opportunity jobs
    const jobs = await smartMoving.getOpportunityJobs(opportunityId)

    if (jobs.length === 0) {
      await createAuditLog(paymentSessionId, 'smartmoving_sync_failed', {
        opportunityId,
        error: 'No jobs found for opportunity'
      })
      logger.warn('No jobs found for SmartMoving opportunity', { opportunityId })
      return
    }

    logger.info('Found SmartMoving jobs', {
      opportunityId,
      jobCount: jobs.length
    })

    // Calculate payment details
    const totalPaid = Number(paymentSession.amount)
    const estimateAmount = totalPaid / (1 + (smartMovingConfig.ccProcessingFeePercent || 2.75) / 100)
    const processingFee = totalPaid - estimateAmount

    // Format payment note
    const paymentNote = formatPaymentNote({
      estimateAmount,
      processingFee,
      totalPaid,
      quoteNumber: quoteNumber || undefined,
      invoiceId: paymentSession.invoiceId,
      processorId: paymentSession.processorPaymentId || undefined,
      customerEmail: customerEmail || 'Unknown',
      timestamp: new Date()
    })

    // Update all jobs with payment notes and confirm
    const jobIds: string[] = []
    const confirmCategory = smartMovingConfig.confirmCategory || 'deposit'

    for (const job of jobs) {
      try {
        // Update job accounting notes
        await smartMoving.updateJobNotes(opportunityId, job.id, {
          accountingNotes: paymentNote
        })

        // Confirm job with category
        await smartMoving.confirmJob(opportunityId, job.id, confirmCategory)

        jobIds.push(job.id)

        logger.info('SmartMoving job updated and confirmed', {
          opportunityId,
          jobId: job.id,
          confirmCategory
        })
      } catch (error) {
        logger.error('Error updating SmartMoving job', {
          opportunityId,
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue with other jobs even if one fails
      }
    }

    const syncDuration = Date.now() - syncStartTime

    // Create success audit log
    await createAuditLog(paymentSessionId, 'smartmoving_sync_success', {
      opportunityId,
      jobIds,
      jobCount: jobs.length,
      quoteNumber,
      paymentAmount: totalPaid,
      estimateAmount,
      processingFee,
      invoiceId: paymentSession.invoiceId,
      syncDuration
    })

    logger.info('SmartMoving sync completed successfully', {
      paymentSessionId,
      opportunityId,
      jobCount: jobs.length,
      syncDuration
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('SmartMoving sync failed', {
      paymentSessionId,
      error: errorMessage,
      stack: errorStack
    })

    // Create failure audit log
    await createAuditLog(paymentSessionId, 'smartmoving_sync_failed', {
      error: errorMessage,
      stack: errorStack
    })

    // Don't throw - payment should succeed even if SmartMoving sync fails
  }
}

/**
 * Helper to create audit log
 */
async function createAuditLog(
  paymentSessionId: string,
  action: string,
  metadata: any
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        paymentSessionId,
        action,
        actor: 'system:smartmoving',
        metadata
      }
    })
  } catch (error) {
    logger.error('Error creating audit log', {
      paymentSessionId,
      action,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
