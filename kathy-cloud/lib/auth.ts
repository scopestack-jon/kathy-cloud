// Supabase authentication middleware for API routes
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import prisma from './prisma'
import logger from './logger'

// Supabase client with service role key for backend operations
// During build, use placeholder values if not set
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export interface AuthenticatedUser {
  id: string
  email: string
  organization_id: string
  role: string
  metadata?: any
}

/**
 * Verify Supabase JWT token and get authenticated user
 * Falls back to API key for backward compatibility
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    logger.warn('Missing authorization header')
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  // Try Supabase JWT verification first
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      // Fall back to legacy API key check
      return verifyLegacyApiKey(token)
    }

    // Fetch user's organization and role from database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        organization: true
      }
    })

    if (!userData) {
      logger.warn(`User ${user.id} authenticated but not found in database`)
      return null
    }

    return {
      id: userData.id,
      email: userData.email,
      organization_id: userData.organizationId,
      role: userData.role,
      metadata: userData.metadata
    }
  } catch (error) {
    logger.error('Error verifying auth token:', error)
    return null
  }
}

/**
 * Legacy API key verification for backward compatibility
 * @deprecated Use Supabase auth instead
 */
function verifyLegacyApiKey(token: string): AuthenticatedUser | null {
  const expectedKey = process.env.API_SECRET_KEY

  if (!expectedKey) {
    logger.error('API_SECRET_KEY not configured')
    return null
  }

  if (token === expectedKey) {
    logger.warn('Using legacy API key authentication - migrate to Supabase Auth')
    // Return a mock user for legacy mode
    return {
      id: 'legacy-user',
      email: 'legacy@kathy.dev',
      organization_id: '00000000-0000-0000-0000-000000000001',
      role: 'admin',
      metadata: { legacy: true }
    }
  }

  return null
}

/**
 * Middleware wrapper to require authentication
 * Attaches user object to request
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Attach user to request for use in handler
    // @ts-ignore
    request.user = user

    return handler(request, ...args)
  }
}

/**
 * Middleware for admin-only routes
 */
export function withAdminAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // @ts-ignore
    request.user = user

    return handler(request, ...args)
  }
}

