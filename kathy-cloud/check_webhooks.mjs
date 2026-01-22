import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== CHECKING LATEST PAYMENT SESSION ===\n')

  const latest = await prisma.paymentSession.findFirst({
    where: {
      invoiceId: '35488'
    },
    orderBy: { createdAt: 'desc' },
    include: {
      auditLogs: {
        orderBy: { timestamp: 'desc' }
      }
    }
  })

  if (!latest) {
    console.log('No payment session found for invoice 35488')
    return
  }

  console.log(`Payment Session ID: ${latest.id}`)
  console.log(`Invoice: ${latest.invoiceId}`)
  console.log(`Amount: $${latest.amount}`)
  console.log(`Status: ${latest.status}`)
  console.log(`Created: ${latest.createdAt.toISOString()}`)
  console.log(`Updated: ${latest.updatedAt.toISOString()}`)
  console.log(`Payment URL: ${latest.paymentUrl?.substring(0, 80)}...`)
  console.log(`\nAudit Log Events (${latest.auditLogs.length}):\n`)

  latest.auditLogs.forEach(log => {
    console.log(`  ${log.timestamp.toISOString()} - ${log.action}`)
    if (log.metadata) {
      const meta = log.metadata
      if (meta.error) console.log(`    Error: ${meta.error}`)
      if (meta.hasCustomerData !== undefined) console.log(`    Customer Data: ${meta.hasCustomerData}`)
      if (meta.opportunityId) console.log(`    Opportunity ID: ${meta.opportunityId}`)
      if (meta.quoteNumber) console.log(`    Quote Number: ${meta.quoteNumber}`)
    }
  })

  console.log('\n=== WEBHOOK ACTIVITY (Last 2 Hours) ===\n')

  const webhookLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        contains: 'webhook'
      },
      timestamp: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    },
    orderBy: { timestamp: 'desc' }
  })

  if (webhookLogs.length === 0) {
    console.log('No webhook events found in the last 2 hours')
  } else {
    webhookLogs.forEach(log => {
      console.log(`${log.timestamp.toISOString()} - ${log.action}`)
      console.log(`  Session: ${log.paymentSessionId}`)
    })
  }

  console.log('\n=== SMARTMOVING SYNC ACTIVITY ===\n')

  const syncLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        startsWith: 'smartmoving'
      },
      timestamp: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    },
    orderBy: { timestamp: 'desc' }
  })

  if (syncLogs.length === 0) {
    console.log('No SmartMoving sync activity found')
  } else {
    syncLogs.forEach(log => {
      console.log(`${log.timestamp.toISOString()} - ${log.action}`)
      console.log(`  Session: ${log.paymentSessionId}`)
      if (log.metadata) {
        console.log(`  Metadata:`, JSON.stringify(log.metadata, null, 2))
      }
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
