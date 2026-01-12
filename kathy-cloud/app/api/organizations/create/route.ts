import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../../../../lib/auth'
import logger from '../../../../lib/logger'

const prisma = new PrismaClient()

/**
 * POST /api/organizations/create
 * Create a new organization and associate the authenticated user as admin
 * Called during sign-up flow
 */
async function handlePost(request: NextRequest) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { organizationName, slug } = body

    if (!organizationName || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationName, slug' },
        { status: 400 }
      )
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      )
    }

    // Check if user already has an organization
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true }
    })

    if (existingUser && existingUser.organization) {
      return NextResponse.json(
        { 
          error: 'User already belongs to an organization',
          organization: existingUser.organization 
        },
        { status: 400 }
      )
    }

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already taken. Please choose another.' },
        { status: 409 }
      )
    }

    // Create organization and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          settings: {}
        }
      })

      // Create or update user as admin
      const adminUser = await tx.user.upsert({
        where: { id: user.id },
        update: {
          organizationId: organization.id,
          email: user.email,
          role: 'admin'
        },
        create: {
          id: user.id,
          organizationId: organization.id,
          email: user.email,
          role: 'admin',
          metadata: {}
        }
      })

      // Create default Practice Panther config (optional)
      const defaultConfig = await tx.applicationConfig.create({
        data: {
          organizationId: organization.id,
          applicationName: 'Practice Panther',
          applicationUrl: 'https://app.practicepanther.com',
          urlPattern: 'https://app.practicepanther.com/*',
          isEnabled: false, // User needs to configure it
          selectorConfig: {
            invoiceIdColumn: 0,
            amountColumn: 3,
            statusColumn: 4,
            invoiceIdPattern: 'I-\\d+',
            amountPattern: '\\$?([\\d,]+\\.?\\d*)',
            note: 'Default configuration - please run visual configurator to customize'
          }
        }
      })

      return { organization, adminUser, defaultConfig }
    })

    logger.info(`Organization ${result.organization.id} created by user ${user.id}`)

    return NextResponse.json({
      organization: result.organization,
      user: result.adminUser,
      message: 'Organization created successfully'
    }, { status: 201 })

  } catch (error) {
    logger.error('Error creating organization:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost)


