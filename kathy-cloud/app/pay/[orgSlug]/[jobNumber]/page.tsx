import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
  getPublicQuote,
  extractDepositAmount,
  calculateProcessingFee,
  type SmartMovingConfig,
} from '@/lib/smartmoving'
import PaymentForm from './PaymentForm'

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
    title: organization ? `Pay Deposit - ${organization.name}` : 'Pay Deposit',
    description: 'Secure your move by paying your deposit online.',
  }
}

export default async function PaymentPage({ params }: PageProps) {
  const { orgSlug, jobNumber } = await params

  // Parse quote number from job number (e.g., "35493-1" → "35493")
  const quoteNumber = jobNumber.split('-')[0]

  if (!quoteNumber) {
    notFound()
  }

  // Get organization by slug
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      name: true,
      settings: true,
    },
  })

  if (!organization) {
    notFound()
  }

  // Check SmartMoving configuration
  const settings = organization.settings as Record<string, unknown> | null
  const smartMovingConfig = settings?.smartMoving as SmartMovingConfig | undefined

  if (!smartMovingConfig?.enabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Page Unavailable
          </h1>
          <p className="text-gray-600">
            Online payments are not currently available for this organization.
            Please contact the company directly.
          </p>
        </div>
      </div>
    )
  }

  // Fetch quote from SmartMoving public API
  let quote
  try {
    quote = await getPublicQuote(quoteNumber)
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Quote Not Found
          </h1>
          <p className="text-gray-600">
            We couldn&apos;t find your quote. Please check the link in your email
            or contact the company directly.
          </p>
        </div>
      </div>
    )
  }

  // Extract deposit amount
  const depositFieldNames = smartMovingConfig.depositFieldNames
  const { amount: depositAmount, source: depositSource } = extractDepositAmount(
    quote,
    depositFieldNames
  )

  if (depositAmount <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-yellow-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            No Deposit Required
          </h1>
          <p className="text-gray-600">
            There is no deposit amount configured for this quote.
            Please contact the company if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  // Calculate processing fee
  const feePercent = smartMovingConfig.ccProcessingFeePercent || 2.75
  const feeCalculation = calculateProcessingFee(depositAmount, feePercent)

  // Get origin and destination
  let origin: string | undefined
  let destination: string | undefined

  for (const job of quote.jobs || []) {
    for (const stop of job.stops || []) {
      if (stop.isOrigin) {
        origin = stop.address?.fullAddress
      }
      if (stop.isDestination) {
        destination = stop.address?.fullAddress
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-gray-600 mt-1">Secure Deposit Payment</p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Quote summary */}
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Quote #{quote.quoteNumber}
              </h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                Deposit Due
              </span>
            </div>

            {/* Customer info */}
            <div className="text-sm text-gray-600 mb-4">
              <p className="font-medium text-gray-900">{quote.customer?.name}</p>
              {quote.customer?.emailAddress && (
                <p>{quote.customer.emailAddress}</p>
              )}
            </div>

            {/* Move details */}
            {(origin || destination) && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">From</p>
                      <p className="text-sm text-gray-900">{origin || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">To</p>
                      <p className="text-sm text-gray-900">{destination || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment details */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payment Details
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {depositSource === 'depositAmount' ? 'Deposit' : depositSource}
                </span>
                <span className="font-medium">${depositAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Credit Card Fee ({feePercent}%)
                </span>
                <span className="font-medium">
                  ${feeCalculation.feeAmount.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-900 font-semibold">Total Due</span>
                <span className="text-xl font-bold text-green-600">
                  ${feeCalculation.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment form/button */}
            <PaymentForm
              orgSlug={orgSlug}
              jobNumber={jobNumber}
              totalAmount={feeCalculation.totalAmount}
            />
          </div>
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
            <span>Secure payment powered by Kathy</span>
          </div>
        </div>
      </main>
    </div>
  )
}
