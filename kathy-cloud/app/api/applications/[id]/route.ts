import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../../../../lib/auth'
import logger from '../../../../lib/logger'

const prisma = new PrismaClient()

/**
 * GET /api/applications/[id]
 * Get a specific application configuration
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    const { id } = await params

    const application = await prisma.applicationConfig.findFirst({
      where: {
        id,
        organizationId: user.organization_id
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ application })
  } catch (error) {
    logger.error('Error fetching application:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/applications/[id]
 * Update an application configuration
 * Requires admin role
 */
async function handlePatch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can modify application configurations' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Verify application belongs to user's organization
    const existing = await prisma.applicationConfig.findFirst({
      where: {
        id,
        organizationId: user.organization_id
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Update application
    const updated = await prisma.applicationConfig.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    })

    logger.info(`Application ${id} updated by user ${user.id}`)

    return NextResponse.json({ application: updated })
  } catch (error) {
    logger.error('Error updating application:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/applications/[id]
 * Delete (disable) an application configuration
 * Requires admin role
 */
async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete application configurations' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify application belongs to user's organization
    const existing = await prisma.applicationConfig.findFirst({
      where: {
        id,
        organizationId: user.organization_id
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isEnabled to false
    await prisma.applicationConfig.update({
      where: { id },
      data: {
        isEnabled: false,
        updatedAt: new Date()
      }
    })

    logger.info(`Application ${id} disabled by user ${user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting application:', error)
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGet)
export const PATCH = withAuth(handlePatch)
export const DELETE = withAuth(handleDelete)

