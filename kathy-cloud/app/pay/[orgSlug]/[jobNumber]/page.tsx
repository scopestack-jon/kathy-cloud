import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
  SmartMovingClient,
  extractDepositAmount,
  calculateProcessingFee,
  type SmartMovingConfig,
} from '@/lib/smartmoving'
import { FluidPayClient, generateSppUrl } from '@/lib/fluidpay'
import { createPaymentSession } from '@/lib/runpayments-real'
import logger from '@/lib/logger'

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

/**
 * Payment page that immediately redirects to hosted payment provider
 * Supports both FluidPay (primary) and RunPayments (legacy)
 */
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

  if (!smartMovingConfig?.enabled || !smartMovingConfig.apiKey || !smartMovingConfig.clientId) {
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

  // Fetch quote from SmartMoving API using authenticated client
  const smartMovingClient = new SmartMovingClient(smartMovingConfig)
  let quote
  try {
    quote = await smartMovingClient.getOpportunityByQuoteNumber(quoteNumber)
  } catch (error) {
    logger.error('Failed to fetch SmartMoving quote', {
      quoteNumber,
      error: error instanceof Error ? error.message : String(error),
    })
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

  logger.info('Processing payment page request', {
    orgSlug,
    jobNumber,
    quoteNumber,
    depositAmount,
    depositSource,
    totalAmount: feeCalculation.totalAmount,
    paymentProvider: smartMovingConfig.paymentProvider || 'runpayments',
  })

  // Create invoice ID (internal tracking - can have hyphens)
  const invoiceId = `SM-${quoteNumber}-${jobNumber}`
  // FluidPay invoice number must be alphanumeric only
  const fluidpayInvoiceNumber = `SM${quoteNumber}${jobNumber.replace(/-/g, '')}`.slice(0, 50)

  // Split customer name
  const customerName = quote.customer?.name || 'Customer'
  const nameParts = customerName.trim().split(/\s+/)
  const customerFirstName = nameParts[0] || 'Customer'
  const customerLastName = nameParts.slice(1).join(' ') || ''

  // Determine payment provider and create payment URL
  const paymentProvider = smartMovingConfig.paymentProvider || 'runpayments'
  let paymentUrl: string

  try {
    if (paymentProvider === 'fluidpay' && smartMovingConfig.fluidpay?.apiKey) {
      const fluidpayConfig = smartMovingConfig.fluidpay

      // Check if SPP is enabled and configured
      if (fluidpayConfig.sppEnabled && fluidpayConfig.sppSlug) {
        // Use FluidPay Simple Payment Page (SPP)
        paymentUrl = await createFluidPaySppSession({
          organizationId: organization.id,
          organizationName: organization.name,
          invoiceId,
          jobNumber,
          quoteNumber,
          depositAmount,
          depositSource,
          totalAmountCents: Math.round(feeCalculation.totalAmount * 100),
          feeCalculation,
          customerFirstName,
          customerLastName,
          customerEmail: quote.customer?.emailAddress || '',
          customerPhone: quote.customer?.phoneNumber,
          fluidpayConfig: {
            apiKey: fluidpayConfig.apiKey,
            environment: fluidpayConfig.environment,
            sppSlug: fluidpayConfig.sppSlug,
            sppCustomFields: fluidpayConfig.sppCustomFields,
          },
        })
      } else {
        // Use FluidPay Invoice API (fallback)
        paymentUrl = await createFluidPayInvoice({
          organizationId: organization.id,
          organizationName: organization.name,
          invoiceId,
          fluidpayInvoiceNumber,
          jobNumber,
          quoteNumber,
          depositAmount,
          depositSource,
          totalAmountCents: Math.round(feeCalculation.totalAmount * 100),
          feeCalculation,
          customerFirstName,
          customerLastName,
          customerEmail: quote.customer?.emailAddress || '',
          customerPhone: quote.customer?.phoneNumber,
          fluidpayConfig,
        })
      }
    } else {
      // Use RunPayments (legacy)
      paymentUrl = await createRunPaymentsSession({
        organizationId: organization.id,
        organizationName: organization.name,
        invoiceId,
        jobNumber,
        quoteNumber,
        depositAmount,
        depositSource,
        totalAmount: feeCalculation.totalAmount,
        feeCalculation,
        customerName,
        customerEmail: quote.customer?.emailAddress || '',
        customerPhone: quote.customer?.phoneNumber,
      })
    }
  } catch (error) {
    logger.error('Failed to create payment session', {
      paymentProvider,
      quoteNumber,
      error: error instanceof Error ? error.message : String(error),
    })
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Payment System Error
          </h1>
          <p className="text-gray-600">
            We couldn&apos;t initialize the payment system. Please try again
            or contact the company directly.
          </p>
        </div>
      </div>
    )
  }

  // Redirect to hosted payment page
  redirect(paymentUrl)
}

// ============================================================================
// Helper Functions
// ============================================================================

interface CreateFluidPayInvoiceParams {
  organizationId: string
  organizationName: string
  invoiceId: string
  fluidpayInvoiceNumber: string
  jobNumber: string
  quoteNumber: string
  depositAmount: number
  depositSource: string
  totalAmountCents: number
  feeCalculation: {
    estimateAmount: number
    feePercent: number
    feeAmount: number
    totalAmount: number
  }
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone?: string
  fluidpayConfig: {
    apiKey: string
    environment: 'sandbox' | 'production'
  }
}

async function createFluidPayInvoice(params: CreateFluidPayInvoiceParams): Promise<string> {
  const {
    organizationId,
    organizationName,
    invoiceId,
    fluidpayInvoiceNumber,
    jobNumber,
    quoteNumber,
    depositAmount,
    depositSource,
    totalAmountCents,
    feeCalculation,
    customerFirstName,
    customerLastName,
    customerEmail,
    customerPhone,
    fluidpayConfig,
  } = params

  // Create payment session in database first
  const paymentSession = await prisma.paymentSession.create({
    data: {
      organizationId,
      applicationName: 'SmartMoving',
      invoiceId,
      amount: feeCalculation.totalAmount,
      currency: 'USD',
      status: 'initiated',
      metadata: {
        quoteNumber,
        jobNumber,
        depositAmount,
        depositSource,
        processingFee: feeCalculation.feeAmount,
        customerName: `${customerFirstName} ${customerLastName}`.trim(),
        customerEmail,
        source: 'public_payment_page',
        paymentProvider: 'fluidpay',
      },
    },
  })

  // Initialize FluidPay client
  const fluidpay = new FluidPayClient(fluidpayConfig)

  // Create invoice with FluidPay
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)  // Due in 7 days

  const invoice = await fluidpay.createInvoice({
    companyName: organizationName,
    customerFirstName,
    customerLastName,
    customerEmail,
    customerPhone,
    amount: totalAmountCents,  // FluidPay expects cents
    description: `Deposit for Quote #${quoteNumber}`,
    invoiceNumber: fluidpayInvoiceNumber,
    dueDate,
    paymentMethods: ['card'],  // Card-only to avoid ACH processor requirement
  })

  // Update payment session with FluidPay details
  await prisma.paymentSession.update({
    where: { id: paymentSession.id },
    data: {
      processorPaymentId: invoice.id,
      paymentUrl: invoice.hostedUrl,
      status: 'pending',
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      paymentSessionId: paymentSession.id,
      action: 'payment_initiated_from_public_page',
      actor: 'customer',
      metadata: {
        quoteNumber,
        jobNumber,
        depositAmount,
        depositSource,
        processingFee: feeCalculation.feeAmount,
        totalAmount: feeCalculation.totalAmount,
        customerEmail,
        customerName: `${customerFirstName} ${customerLastName}`.trim(),
        paymentProvider: 'fluidpay',
        fluidpayInvoiceId: invoice.id,
      },
    },
  })

  logger.info('FluidPay invoice created for public payment', {
    paymentSessionId: paymentSession.id,
    fluidpayInvoiceId: invoice.id,
    quoteNumber,
    jobNumber,
    totalAmount: feeCalculation.totalAmount,
  })

  return invoice.hostedUrl
}

interface CreateFluidPaySppSessionParams {
  organizationId: string
  organizationName: string
  invoiceId: string
  jobNumber: string
  quoteNumber: string
  depositAmount: number
  depositSource: string
  totalAmountCents: number
  feeCalculation: {
    estimateAmount: number
    feePercent: number
    feeAmount: number
    totalAmount: number
  }
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone?: string
  fluidpayConfig: {
    apiKey: string
    environment: 'sandbox' | 'production'
    sppSlug: string
    sppCustomFields?: {
      referenceId: string
      emailId?: string
      nameId?: string
      quoteId?: string
    }
  }
}

async function createFluidPaySppSession(params: CreateFluidPaySppSessionParams): Promise<string> {
  const {
    organizationId,
    invoiceId,
    jobNumber,
    quoteNumber,
    depositAmount,
    depositSource,
    totalAmountCents,
    feeCalculation,
    customerFirstName,
    customerLastName,
    customerEmail,
    customerPhone,
    fluidpayConfig,
  } = params

  // Create payment session in database first (generates reference ID)
  const paymentSession = await prisma.paymentSession.create({
    data: {
      organizationId,
      applicationName: 'SmartMoving',
      invoiceId,
      amount: feeCalculation.totalAmount,
      currency: 'USD',
      status: 'pending',
      metadata: {
        quoteNumber,
        jobNumber,
        depositAmount,
        depositSource,
        processingFee: feeCalculation.feeAmount,
        customerName: `${customerFirstName} ${customerLastName}`.trim(),
        customerEmail,
        customerPhone,
        source: 'public_payment_page',
        paymentProvider: 'fluidpay_spp',
      },
    },
  })

  // Build custom fields map using configured field IDs
  const customFields: Record<string, string> = {}
  const fieldConfig = fluidpayConfig.sppCustomFields

  if (fieldConfig?.referenceId) {
    customFields[fieldConfig.referenceId] = paymentSession.id
  }
  if (fieldConfig?.emailId && customerEmail) {
    customFields[fieldConfig.emailId] = customerEmail
  }
  if (fieldConfig?.nameId) {
    customFields[fieldConfig.nameId] = `${customerFirstName} ${customerLastName}`.trim()
  }
  if (fieldConfig?.quoteId) {
    customFields[fieldConfig.quoteId] = quoteNumber
  }

  // Generate SPP URL
  const sppUrl = generateSppUrl({
    sppSlug: fluidpayConfig.sppSlug,
    amount: totalAmountCents,
    environment: fluidpayConfig.environment,
    customFields,
  })

  // Update payment session with URL
  await prisma.paymentSession.update({
    where: { id: paymentSession.id },
    data: {
      paymentUrl: sppUrl,
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      paymentSessionId: paymentSession.id,
      action: 'payment_initiated_from_public_page',
      actor: 'customer',
      metadata: {
        quoteNumber,
        jobNumber,
        depositAmount,
        depositSource,
        processingFee: feeCalculation.feeAmount,
        totalAmount: feeCalculation.totalAmount,
        customerEmail,
        customerName: `${customerFirstName} ${customerLastName}`.trim(),
        paymentProvider: 'fluidpay_spp',
        sppSlug: fluidpayConfig.sppSlug,
        customFields,
      },
    },
  })

  logger.info('FluidPay SPP session created for public payment', {
    paymentSessionId: paymentSession.id,
    sppSlug: fluidpayConfig.sppSlug,
    quoteNumber,
    jobNumber,
    totalAmount: feeCalculation.totalAmount,
    hasCustomFields: Object.keys(customFields).length > 0,
  })

  return sppUrl
}

interface CreateRunPaymentsSessionParams {
  organizationId: string
  organizationName: string
  invoiceId: string
  jobNumber: string
  quoteNumber: string
  depositAmount: number
  depositSource: string
  totalAmount: number
  feeCalculation: {
    estimateAmount: number
    feePercent: number
    feeAmount: number
    totalAmount: number
  }
  customerName: string
  customerEmail: string
  customerPhone?: string
}

async function createRunPaymentsSession(params: CreateRunPaymentsSessionParams): Promise<string> {
  const {
    organizationId,
    organizationName,
    invoiceId,
    jobNumber,
    quoteNumber,
    depositAmount,
    depositSource,
    totalAmount,
    feeCalculation,
    customerName,
    customerEmail,
    customerPhone,
  } = params

  // Create payment session in database
  const paymentSession = await prisma.paymentSession.create({
    data: {
      organizationId,
      applicationName: 'SmartMoving',
      invoiceId,
      amount: totalAmount,
      currency: 'USD',
      status: 'initiated',
      metadata: {
        quoteNumber,
        jobNumber,
        depositAmount,
        depositSource,
        processingFee: feeCalculation.feeAmount,
        customerName,
        customerEmail,
        source: 'public_payment_page',
        paymentProvider: 'runpayments',
      },
    },
  })

  // Create compound invoice ID for multi-tenant isolation
  const compoundInvoiceId = `${organizationId}:${invoiceId}`

  // Create RunPayments hosted payment session
  const runPaymentsSession = await createPaymentSession({
    amount: totalAmount,
    currency: 'USD',
    invoiceId: compoundInvoiceId,
    originalInvoiceId: invoiceId,
    paymentSessionId: paymentSession.id,
    description: `Deposit for Quote #${quoteNumber} - ${organizationName}`,
    customerName,
    customerEmail,
    customerPhone,
  })

  // Update payment session with processor details
  await prisma.paymentSession.update({
    where: { id: paymentSession.id },
    data: {
      processorPaymentId: runPaymentsSession.id,
      paymentUrl: runPaymentsSession.paymentUrl,
      status: 'pending',
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      paymentSessionId: paymentSession.id,
      action: 'payment_initiated_from_public_page',
      actor: 'customer',
      metadata: {
        quoteNumber,
        jobNumber,
        depositAmount,
        depositSource,
        processingFee: feeCalculation.feeAmount,
        totalAmount,
        customerEmail,
        customerName,
        paymentProvider: 'runpayments',
      },
    },
  })

  logger.info('RunPayments session created for public payment', {
    paymentSessionId: paymentSession.id,
    quoteNumber,
    jobNumber,
    totalAmount,
  })

  return runPaymentsSession.paymentUrl
}
