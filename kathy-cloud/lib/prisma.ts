import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  // During build, we might not have a valid DATABASE_URL
  // Return a mock client that won't be used
  if (process.env.VERCEL_ENV === 'production' && !process.env.DATABASE_URL) {
    console.warn('No DATABASE_URL during build, using placeholder client')
    return {} as PrismaClient
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

