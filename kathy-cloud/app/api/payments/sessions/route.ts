import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'

/**
 * GET /api/payments/sessions
 * Get all payment sessions for the authenticated user's organization
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    logger.info('Fetching payment sessions', { 
      userId: user.id,
      organizationId: user.organization_id 
    })

    // Fetch payment sessions for the user's organization
    // RLS policies will automatically filter to only this organization's data
    const paymentSessions = await prisma.paymentSession.findMany({
      where: {
        organizationId: user.organization_id
      },
      include: {
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5 // Include last 5 audit logs for each session
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    logger.info('Payment sessions fetched', { 
      count: paymentSessions.length,
      organizationId: user.organization_id 
    })

    return NextResponse.json({
      success: true,
      sessions: paymentSessions
    })

  } catch (error) {
    logger.error('Error fetching payment sessions', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment sessions' },
      { status: 500 }
    )
  }
})

