import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== ORGANIZATION SMARTMOVING CONFIG ===\n')

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true
    }
  })

  orgs.forEach(org => {
    console.log(`Organization: ${org.name} (${org.slug})`)
    console.log(`ID: ${org.id}`)

    const smartMoving = org.settings?.smartMoving
    if (smartMoving) {
      console.log('SmartMoving Config:')
      console.log(`  Enabled: ${smartMoving.enabled}`)
      console.log(`  Has API Key: ${!!smartMoving.apiKey}`)
      console.log(`  API Key Preview: ${smartMoving.apiKey?.substring(0, 10)}...`)
      console.log(`  Has Client ID: ${!!smartMoving.clientId}`)
      console.log(`  Client ID: ${smartMoving.clientId}`)
      console.log(`  Fee Percent: ${smartMoving.ccProcessingFeePercent || 2.75}%`)
    } else {
      console.log('SmartMoving: NOT CONFIGURED')
    }
    console.log('---\n')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
