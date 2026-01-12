import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

// Admin client for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, companyName } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName
      }
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    try {
      // Create organization
      const organization = await prisma.organization.create({
        data: {
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        }
      })

      // Create user record
      await prisma.user.create({
        data: {
          id: userId,
          email,
          firstName,
          lastName,
          organizationId: organization.id
        }
      })

      // Create default Practice Panther application config
      await prisma.applicationConfig.create({
        data: {
          applicationName: 'Practice Panther',
          applicationUrl: 'https://app.practicepanther.com',
          organizationId: organization.id,
          urlPattern: 'practicepanther.com',
          selectorConfig: {
            invoiceIdColumnIndex: 1,
            invoiceIdPattern: 'I-\\d+',
            amountColumnIndex: 8,
            amountPattern: '\\$?([\\d,]+\\.?\\d*)',
            statusColumnIndex: 8,
            selector: 'table.invoice-table'
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        userId,
        organizationId: organization.id
      })
    } catch (dbError: any) {
      console.error('Database error:', dbError)
      
      // Rollback: delete the auth user if database creation failed
      await supabaseAdmin.auth.admin.deleteUser(userId)
      
      return NextResponse.json(
        { error: 'Failed to create organization. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

