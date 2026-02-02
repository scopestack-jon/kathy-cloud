import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'

interface PageProps {
  params: Promise<{
    orgSlug: string
    jobNumber: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { orgSlug } = await params

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { name: true },
  })

  return {
    title: organization ? `Payment Confirmed - ${organization.name}` : 'Payment Confirmed',
    description: 'Your deposit payment has been received.',
  }
}

export default async function SuccessPage({ params }: PageProps) {
  const { orgSlug, jobNumber } = await params

  // Parse quote number from job number
  const quoteNumber = jobNumber.split('-')[0]

  // Get organization by slug
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      name: true,
    },
  })

  if (!organization) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden text-center p-8">
          {/* Success icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>

          <p className="text-gray-600 mb-6">
            Thank you for your deposit payment. Your move has been confirmed.
          </p>

          {/* Quote reference */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block">
            <p className="text-sm text-gray-500">Quote Reference</p>
            <p className="text-lg font-semibold text-gray-900">#{quoteNumber}</p>
          </div>

          {/* Next steps */}
          <div className="text-left bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>You will receive a confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Our team will be in touch to finalize your move details</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Keep this confirmation for your records</span>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <p className="text-sm text-gray-500">
            Questions? Contact {organization.name} directly for assistance.
          </p>
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Secure payment processed by Kathy</span>
          </div>
        </div>
      </main>
    </div>
  )
}
