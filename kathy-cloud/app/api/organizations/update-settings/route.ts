import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'
import { withAuth } from '@/lib/auth'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * POST /api/organizations/update-settings
 * Update organization settings (including SmartMoving configuration)
 */
async function handlePost(request: NextRequest) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    const body = await request.json()

    const { organizationId, settings } = body

    if (!organizationId || !settings) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, settings' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify user belongs to this organization
    if (user.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own organization' },
        { status: 403, headers: corsHeaders }
      )
    }

    logger.info('Updating organization settings', {
      organizationId,
      userId: user.id,
      hasSmartMoving: !!settings.smartMoving
    })

    // Update organization settings
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: settings
      }
    })

    logger.info('Organization settings updated successfully', {
      organizationId,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        settings: organization.settings
      }
    }, { headers: corsHeaders })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('Error updating organization settings', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        error: 'Failed to update organization settings',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

export const POST = withAuth(handlePost)
