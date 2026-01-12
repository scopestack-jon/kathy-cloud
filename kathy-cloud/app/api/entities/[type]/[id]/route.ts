import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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
 * GET /api/entities/[type]/[id]
 * Fetch enriched entity data for the side panel
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params
    
    logger.info('Fetching entity', { type, id })
    
    if (type === 'invoice') {
      // Fetch invoice-related data
      const paymentSessions = await prisma.paymentSession.findMany({
        where: { invoiceId: id },
        orderBy: { createdAt: 'desc' }
      })
      
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          metadata: {
            path: ['invoiceId'],
            equals: id
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      })
      
      // Calculate summary stats
      const totalPaid = paymentSessions
        .filter(ps => ps.status === 'paid_and_confirmed')
        .reduce((sum, ps) => sum + parseFloat(ps.amount.toString()), 0)
      
      const latestSession = paymentSessions[0]
      
      return NextResponse.json({
        type: 'invoice',
        id,
        data: {
          invoiceId: id,
          paymentSessions: paymentSessions.map(ps => ({
            id: ps.id,
            amount: ps.amount,
            status: ps.status,
            createdAt: ps.createdAt,
            updatedAt: ps.updatedAt,
            paymentUrl: ps.paymentUrl,
            processorPaymentId: ps.processorPaymentId
          })),
          auditLogs: auditLogs.map(log => ({
            id: log.id,
            event: log.action,
            metadata: log.metadata,
            createdAt: log.timestamp
          })),
          summary: {
            totalPaid,
            totalSessions: paymentSessions.length,
            latestStatus: latestSession?.status || 'no_payments',
            lastUpdated: latestSession?.updatedAt || new Date()
          }
        }
      }, { headers: corsHeaders })
    } else if (type === 'contact') {
      // Placeholder for contact entities
      return NextResponse.json({
        type: 'contact',
        id,
        data: {
          message: 'Contact enrichment coming soon'
        }
      }, { headers: corsHeaders })
    } else if (type === 'company') {
      // Placeholder for company entities
      return NextResponse.json({
        type: 'company',
        id,
        data: {
          message: 'Company enrichment coming soon'
        }
      }, { headers: corsHeaders })
    } else {
      return NextResponse.json(
        { error: 'Unknown entity type' },
        { status: 400, headers: corsHeaders }
      )
    }
  } catch (error) {
    logger.error('Error fetching entity', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export const GET = withAuth(handleGet)

