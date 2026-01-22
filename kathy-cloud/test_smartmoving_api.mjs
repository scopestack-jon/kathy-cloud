import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get SmartMoving credentials
  const org = await prisma.organization.findUnique({
    where: { id: 'f072f860-480e-4494-bf2a-21c80e4f3c49' },
    select: { settings: true }
  })

  const smartMoving = org.settings?.smartMoving
  if (!smartMoving || !smartMoving.enabled) {
    console.log('SmartMoving not configured or not enabled')
    return
  }

  console.log('SmartMoving Config:')
  console.log(`  API Key: ${smartMoving.apiKey?.substring(0, 15)}...`)
  console.log(`  Client ID: ${smartMoving.clientId}`)
  console.log('')

  // Test 1: Get all leads
  console.log('=== TEST 1: Get All Leads ===\n')
  try {
    const response = await fetch('https://api-public.smartmoving.com/v1/api/leads', {
      headers: {
        'x-api-key': smartMoving.apiKey,
        'x-client-id': smartMoving.clientId
      }
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Error: ${errorText}`)
      return
    }

    const data = await response.json()
    console.log('Response type:', typeof data)
    console.log('Response keys:', Object.keys(data || {}))
    console.log('Full response:', JSON.stringify(data, null, 2).substring(0, 1000))

    const leads = data.pageResults || []
    console.log(`Found ${leads.length} leads (Total: ${data.totalResults})`)

    // Debug: Show first lead structure
    if (leads.length > 0) {
      console.log('\nFirst lead structure:', JSON.stringify(leads[0], null, 2))
    }

    // Find lead with quote number 35488
    const targetLead = leads.find(l => l.quoteNumber === '35488' || l.quoteNumber === 35488)
    if (targetLead) {
      console.log('\nFound lead 35488:')
      console.log(`  ID: ${targetLead.id}`)
      console.log(`  Quote Number: ${targetLead.quoteNumber}`)
      console.log(`  Customer: ${targetLead.customer?.name}`)
      console.log(`  Email: ${targetLead.customer?.emailAddress}`)
      console.log(`  Status: ${targetLead.status}`)

      // Test 2: Get full opportunity details
      console.log('\n=== TEST 2: Get Opportunity Details ===\n')
      const oppResponse = await fetch(`https://api-public.smartmoving.com/v1/api/opportunities/${targetLead.id}`, {
        headers: {
          'x-api-key': smartMoving.apiKey,
          'x-client-id': smartMoving.clientId
        }
      })

      console.log(`Status: ${oppResponse.status} ${oppResponse.statusText}`)

      if (oppResponse.ok) {
        const opp = await oppResponse.json()
        console.log('Full Opportunity Data:')
        console.log(`  Customer Name: ${opp.customer?.name}`)
        console.log(`  Customer Email: ${opp.customer?.emailAddress}`)
        console.log(`  Customer Phone: ${opp.customer?.phoneNumber}`)
        console.log(`  Estimate Total: $${opp.estimatedTotal?.finalTotal}`)
      } else {
        const errorText = await oppResponse.text()
        console.log(`Error: ${errorText}`)
      }
    } else {
      console.log('\n❌ No lead found with quote number 35488')
      console.log('Available quote numbers:', leads.map(l => l.quoteNumber).filter(Boolean).join(', '))
    }

  } catch (error) {
    console.error('Error:', error.message)
    console.error(error.stack)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
