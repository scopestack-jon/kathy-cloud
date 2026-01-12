import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger'

// Make sure this route is always dynamic
export const dynamic = 'force-dynamic'

// Supabase client for verifying JWT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * GET /api/auth/me
 * Get the authenticated user's profile and ensure they have an organization
 * If they don't have an organization, create one for them
 * This endpoint can create the user if they don't exist in the database yet
 */
export async function GET(request: NextRequest) {
  try {
    // Get and verify the Supabase JWT directly (bypass getAuthenticatedUser)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT with Supabase
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !supabaseUser) {
      logger.error('JWT verification failed:', authError)
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    
    logger.info(`Verified Supabase user: ${supabaseUser.email}, ID: ${supabaseUser.id}`)

    // Check if user exists in database
    let dbUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      include: { organization: true }
    })

    logger.info(`Database user lookup result: ${dbUser ? 'Found' : 'Not found'}`)

    // If user doesn't exist in database, create them with a new organization
    if (!dbUser) {
      logger.info(`Creating new user and organization for ${supabaseUser.email}`)
      
      // Get user info from metadata (set during sign-up)
      const firstName = supabaseUser.user_metadata?.first_name || ''
      const lastName = supabaseUser.user_metadata?.last_name || ''
      const orgNameFromMetadata = supabaseUser.user_metadata?.organization_name
      
      // Generate organization name (use metadata or fallback to email domain)
      let orgName: string
      if (orgNameFromMetadata && orgNameFromMetadata.trim().length > 0) {
        orgName = orgNameFromMetadata.trim()
      } else {
        // Fallback: use email domain
        const emailDomain = supabaseUser.email!.split('@')[1]
        orgName = emailDomain.split('.')[0]
      }
      
      // Generate a slug from org name
      const baseSlug = orgName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      
      logger.info(`Generated base slug: ${baseSlug}`)
      
      // Find a unique slug
      let slug = baseSlug
      let counter = 1
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      logger.info(`Final slug: ${slug}`)

      // Create organization (declare outside try-catch for later use)
      let organization
      try {
        organization = await prisma.organization.create({
          data: {
            name: orgName,
            slug: slug,
            settings: {}
          }
        })
        
        logger.info(`Created organization: ${organization.id}`)

        // Create user linked to organization
        dbUser = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            organizationId: organization.id,
            email: supabaseUser.email!,
            firstName: firstName || null,
            lastName: lastName || null,
            role: 'admin', // First user is always admin
            metadata: {}
          },
          include: { organization: true }
        })
        
        logger.info(`Created user: ${dbUser.id}`)
        
        // Create a default Practice Panther config for the new organization
        await prisma.applicationConfig.create({
          data: {
            organizationId: organization.id,
            applicationName: "Practice Panther",
            applicationUrl: "https://app.practicepanther.com",
            urlPattern: "https://app.practicepanther.com/*",
            isEnabled: true,
            selectorConfig: {
              invoiceIdColumn: 1,
              amountColumn: 8,
              statusColumn: 8,
              invoiceIdPattern: "I-\\d+",
              amountPattern: "\\$?([\\d,]+\\.?\\d*)",
              tableSelector: "table"
            }
          }
        })

        logger.info(`Created organization ${organization.id} for user ${supabaseUser.email}`)
      } catch (dbError: any) {
        logger.error('Database error creating org/user:', dbError)
        throw new Error(`Database error: ${dbError.message}`)
      }
    }

    // Return user profile with organization
    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role,
        organizationId: dbUser.organizationId,
        organization: {
          id: dbUser.organization.id,
          name: dbUser.organization.name,
          slug: dbUser.organization.slug
        }
      }
    })

  } catch (error: any) {
    logger.error('Error fetching user profile', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}

