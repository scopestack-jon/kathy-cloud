import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== RECENT PAYMENT SESSIONS (Last 2 Hours) ===\n')

  const payments = await prisma.paymentSession.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      invoiceId: true,
      amount: true,
      status: true,
      applicationName: true,
      sourceUrl: true,
      createdAt: true
    }
  })

  payments.forEach(p => {
    console.log(`Time: ${p.createdAt.toISOString()}`)
    console.log(`ID: ${p.id}`)
    console.log(`Invoice: ${p.invoiceId}`)
    console.log(`Amount: $${p.amount}`)
    console.log(`Status: ${p.status}`)
    console.log(`App: ${p.applicationName}`)
    if (p.sourceUrl) {
      console.log(`Source: ${p.sourceUrl}`)
    }
    console.log('---\n')
  })

  console.log('\n=== RECENT AUDIT LOGS (Last 2 Hours) ===\n')

  const logs = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 40,
    select: {
      action: true,
      actor: true,
      metadata: true,
      timestamp: true,
      paymentSessionId: true
    }
  })

  logs.forEach(l => {
    console.log(`${l.timestamp.toISOString()} | ${l.action} | ${l.actor}`)
    console.log(`  Session: ${l.paymentSessionId}`)
    if (l.metadata) {
      console.log(`  Metadata:`, JSON.stringify(l.metadata, null, 2))
    }
    console.log('')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
