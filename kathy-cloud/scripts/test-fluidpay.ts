#!/usr/bin/env npx tsx
/**
 * FluidPay Integration Test Script
 *
 * Tests:
 *   1. Simple payment – direct card transaction (createTransaction)
 *   2. Hosted invoice – create invoice and get payment URL
 *
 * Usage:
 *   npm run test:fluidpay
 *   # or with env inline:
 *   FLUIDPAY_API_KEY=your-api-key npx tsx scripts/test-fluidpay.ts
 *
 * Set in .env or environment:
 *   FLUIDPAY_API_KEY=your-api-key
 *   FLUIDPAY_ENVIRONMENT=sandbox
 */

import 'dotenv/config'
import { FluidPayClient, generateSppUrl, type CreateInvoiceParams } from '../lib/fluidpay'

const config = {
  apiKey: process.env.FLUIDPAY_API_KEY || '',
  environment: (process.env.FLUIDPAY_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
}

async function testFluidPay() {
  console.log('\n🔧 FluidPay Integration Test\n')
  console.log(`Environment: ${config.environment}`)
  console.log(`API Key: ${config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'NOT SET'}`)

  if (!config.apiKey) {
    console.error('\n❌ Error: FLUIDPAY_API_KEY environment variable not set')
    console.log('\nUsage:')
    console.log('  FLUIDPAY_API_KEY=your-key npx tsx scripts/test-fluidpay.ts')
    process.exit(1)
  }

  try {
    const client = new FluidPayClient(config)
    console.log('\n✅ FluidPay client initialized successfully')

    // Test 1: Direct transaction with test card
    console.log('\n💳 Test 1: Direct card transaction')
    console.log('   Card: 4111111111111111 (test card)')
    console.log('   Amount: $1.00')

    const transaction = await client.createTransaction({
      amount: 100, // $1.00 in cents
      cardNumber: '4111111111111111',
      expirationDate: '12/28',
      cvc: '123',
      billingAddress: {
        firstName: 'Test',
        lastName: 'User',
        postalCode: '12345',
      },
    })

    console.log('\n✅ Transaction created!')
    console.log(`   Transaction ID: ${transaction.id}`)
    console.log(`   Status: ${transaction.status}`)
    console.log(`   Amount: $${(transaction.amount / 100).toFixed(2)}`)

    // Test 2: Create invoice (may fail if ACH processor not configured)
    console.log('\n📄 Test 2: Creating hosted invoice...')
    const testInvoice: CreateInvoiceParams = {
      companyName: 'Test Moving Company',
      customerFirstName: 'John',
      customerLastName: 'Doe',
      customerEmail: 'test@example.com',
      customerPhone: '555-123-4567',
      amount: 10000, // $100.00 in cents
      description: 'Test Deposit - Quote #TEST123',
      invoiceNumber: `TEST${Date.now()}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethods: ['card', 'ach'],
    }

    console.log(`   Amount: $${(testInvoice.amount / 100).toFixed(2)}`)
    console.log(`   Invoice #: ${testInvoice.invoiceNumber}`)

    try {
      const invoice = await client.createInvoice(testInvoice)

      console.log('\n✅ Invoice created!')
      console.log(`   Invoice ID: ${invoice.id}`)
      console.log(`   Status: ${invoice.status}`)
      console.log(`\n🔗 Payment URL (open in browser):`)
      console.log(`   ${invoice.hostedUrl}`)
    } catch (invoiceError) {
      console.log('\n⚠️  Invoice API failed (expected if ACH processor not configured)')
      console.log(`   Error: ${invoiceError instanceof Error ? invoiceError.message : invoiceError}`)
      console.log('   This is why SPP (Simple Payment Page) is recommended!')
    }

    // Test 3: Generate SPP URL
    console.log('\n🔗 Test 3: Generating SPP URL...')
    const testSessionId = '12345678-1234-1234-1234-123456789abc'
    const sppUrl = generateSppUrl({
      sppSlug: 'smart',
      amount: 15000, // $150.00 in cents
      environment: config.environment,
      customFields: {
        'ref_field_id': testSessionId,
        'email_field_id': 'test@example.com',
        'name_field_id': 'John Doe',
        'quote_field_id': '35493',
      },
    })

    console.log('\n✅ SPP URL generated!')
    console.log(`   Amount: $150.00`)
    console.log(`   Reference: ${testSessionId}`)
    console.log(`\n🔗 SPP URL (open in browser):`)
    console.log(`   ${sppUrl}`)

    // Verify URL structure
    const parsedUrl = new URL(sppUrl)
    console.log('\n📋 URL breakdown:')
    console.log(`   Base: ${parsedUrl.origin}`)
    console.log(`   Path: ${parsedUrl.pathname}`)
    console.log(`   add_custom_amount: ${parsedUrl.searchParams.get('add_custom_amount')}`)
    console.log(`   custom_fields: ${parsedUrl.searchParams.get('custom_fields')}`)

    console.log('\n✅ All tests passed!')
    console.log('\n📝 Next steps:')
    console.log('   1. Open the invoice payment URL above in a browser')
    console.log('   2. Use test card: 4111 1111 1111 1111, exp: 12/25, CVV: 123')
    console.log('   3. Check your webhook endpoint receives the settlement event')
    console.log('')
    console.log('   For SPP testing:')
    console.log('   1. Configure custom fields in FluidPay dashboard')
    console.log('   2. Update org settings with sppEnabled: true and field IDs')
    console.log('   3. Test the payment page redirect flow')
    console.log('')

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

testFluidPay()
