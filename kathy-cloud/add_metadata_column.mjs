import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding metadata column to payment_sessions table...')

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS metadata JSONB;'
    )
    console.log('✅ Successfully added metadata column')
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
