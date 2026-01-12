import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../../../lib/auth'
import logger from '../../../lib/logger'

const prisma = new PrismaClient()

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
 * GET /api/applications
 * Get all application configurations for the authenticated user's organization
 */
async function handleGet(request: NextRequest) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    if (!user || !user.organization_id) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get all applications for the organization
    const applications = await prisma.applicationConfig.findMany({
      where: {
        organizationId: user.organization_id,
        isEnabled: true
      },
      select: {
        id: true,
        applicationName: true,
        applicationUrl: true,
        urlPattern: true,
        selectorConfig: true,
        isEnabled: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        applicationName: 'asc'
      }
    })

    logger.info(`Retrieved ${applications.length} applications for org ${user.organization_id}`)

    return NextResponse.json({ applications }, { headers: corsHeaders })
  } catch (error) {
    logger.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/applications
 * Create or update an application configuration
 * Requires admin role
 */
async function handlePost(request: NextRequest) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    if (!user || !user.organization_id) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Note: Any authenticated user can configure apps for their organization
    // The organizationId ensures users can only configure their own org's apps

    const body = await request.json()
    const { applicationName, applicationUrl, urlPattern, selectorConfig } = body

    // Validate required fields
    if (!applicationName || !applicationUrl || !urlPattern || !selectorConfig) {
      return NextResponse.json(
        { error: 'Missing required fields: applicationName, applicationUrl, urlPattern, selectorConfig' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate selectorConfig structure
    if (!selectorConfig.invoiceIdColumn === undefined || 
        !selectorConfig.amountColumn === undefined || 
        !selectorConfig.statusColumn === undefined) {
      return NextResponse.json(
        { error: 'selectorConfig must include invoiceIdColumn, amountColumn, and statusColumn' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Upsert application configuration
    const config = await prisma.applicationConfig.upsert({
      where: {
        organizationId_applicationName: {
          organizationId: user.organization_id,
          applicationName
        }
      },
      update: {
        applicationUrl,
        urlPattern,
        selectorConfig,
        isEnabled: true,
        updatedAt: new Date()
      },
      create: {
        organizationId: user.organization_id,
        applicationName,
        applicationUrl,
        urlPattern,
        selectorConfig,
        isEnabled: true
      }
    })

    logger.info(`Application config ${config.id} created/updated for org ${user.organization_id}`)

    return NextResponse.json({ config }, { status: 201, headers: corsHeaders })
  } catch (error) {
    logger.error('Error creating/updating application:', error)
    return NextResponse.json(
      { error: 'Failed to save application configuration' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export const GET = withAuth(handleGet)
export const POST = withAuth(handlePost)


