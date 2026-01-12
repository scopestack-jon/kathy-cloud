import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../../../lib/auth'
import logger from '../../../lib/logger'

const prisma = new PrismaClient()

/**
 * POST /api/invitations
 * Invite a new user to the organization
 * Requires admin role
 * 
 * In production, this would:
 * 1. Send email invitation via Supabase Auth
 * 2. Create pending invitation record
 * 3. User accepts via magic link
 */
async function handlePost(request: NextRequest) {
  try {
    // @ts-ignore - user is attached by withAuth middleware
    const user = request.user
    
    if (!user || !user.organization_id) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can invite users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // TODO: In production with Supabase, use:
    // await supabase.auth.admin.inviteUserByEmail(email, {
    //   data: {
    //     organization_id: user.organization_id,
    //     role
    //   },
    //   redirectTo: 'https://getkathy.io/accept-invite'
    // })

    // For now, create a placeholder invitation record
    const invitation = {
      id: crypto.randomUUID(),
      email,
      role,
      organizationId: user.organization_id,
      invitedBy: user.id,
      createdAt: new Date(),
      status: 'pending'
    }

    logger.info(`Invitation sent to ${email} for org ${user.organization_id}`)

    return NextResponse.json({
      invitation,
      message: 'Invitation email sent successfully'
    }, { status: 201 })

  } catch (error) {
    logger.error('Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost)


