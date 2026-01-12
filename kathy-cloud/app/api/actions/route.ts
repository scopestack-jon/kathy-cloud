import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * POST /api/actions
 * Trigger workflows and actions from the side panel
 */
async function handlePost(
  request: NextRequest,
  context: any
) {
  try {
    const body = await request.json()
    const { action, entityType, entityId, metadata } = body
    
    logger.info('Action triggered', { action, entityType, entityId })
    
    // For now, we'll skip audit logging for actions that don't have a payment session
    // In the future, we might want a separate actions table or make paymentSessionId optional
    // await prisma.auditLog.create({
    //   data: {
    //     action: `action.${action}`,
    //     paymentSessionId: 'system', // Would need to be optional or have a system session
    //     metadata: {
    //       entityType,
    //       entityId,
    //       ...metadata
    //     }
    //   }
    // })
    
    // Handle different action types
    switch (action) {
      case 'add_to_sequence':
        // Placeholder: Add entity to a workflow sequence
        return NextResponse.json({
          success: true,
          message: `Added ${entityType} ${entityId} to sequence`,
          action: 'add_to_sequence'
        })
      
      case 'create_note':
        // Placeholder: Create a note for the entity
        return NextResponse.json({
          success: true,
          message: `Note created for ${entityType} ${entityId}`,
          action: 'create_note',
          noteId: 'note_' + Date.now()
        })
      
      case 'sync_to_crm':
        // Placeholder: Sync entity to external CRM
        return NextResponse.json({
          success: true,
          message: `${entityType} ${entityId} synced to CRM`,
          action: 'sync_to_crm'
        })
      
      case 'mark_as_reviewed':
        // Mark entity as reviewed
        return NextResponse.json({
          success: true,
          message: `${entityType} ${entityId} marked as reviewed`,
          action: 'mark_as_reviewed'
        })
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Error processing action', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handlePost)

