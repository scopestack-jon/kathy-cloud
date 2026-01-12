// Test script to verify RunPayments API credentials
require('dotenv').config()

const apiUrl = process.env.RUNPAYMENTS_API_URL
const apiKey = process.env.RUNPAYMENTS_API_KEY
const merchantId = process.env.RUNPAYMENTS_MERCHANT_ID

console.log('🔍 Testing RunPayments API Authentication\n')
console.log('Configuration:')
console.log('- API_URL:', apiUrl)
console.log('- API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ NOT SET')
console.log('- MERCHANT_ID:', merchantId || '❌ NOT SET')
console.log('\n' + '='.repeat(60) + '\n')

if (!apiKey || apiKey === 'PASTE_YOUR_API_KEY_HERE') {
  console.error('❌ ERROR: API_KEY is not configured!')
  console.log('\nPlease update your .env file with actual credentials.')
  process.exit(1)
}

if (!merchantId || merchantId === 'PASTE_YOUR_MERCHANT_ID_HERE') {
  console.error('❌ ERROR: MERCHANT_ID is not configured!')
  console.log('\nPlease update your .env file with actual credentials.')
  process.exit(1)
}

// Test API call to create HPP
async function testHPP() {
  try {
    console.log('📡 Testing HPP creation...\n')
    
    const payload = {
      name: "Test Payment Page",
      cc_mid: merchantId,
      amount: "10.00",
      lock_amount: true,
      disable_after_payment: true,
      hpp_options: [
        { invoice_id: "TEST-123" },
        { test: "true" }
      ]
    }

    console.log('Request:')
    console.log(`POST ${apiUrl}/api/v1/hpp`)
    console.log('Headers:')
    console.log(`  Authorization: Bearer ${apiKey.substring(0, 15)}...`)
    console.log(`  Content-Type: application/json`)
    console.log('Body:', JSON.stringify(payload, null, 2))
    console.log('\n' + '='.repeat(60) + '\n')

    const response = await fetch(`${apiUrl}/api/v1/hpp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Kathy-Test/1.0'
      },
      body: JSON.stringify(payload)
    })

    console.log('Response:')
    console.log('- Status:', response.status, response.statusText)
    console.log('- Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('- Body:', responseText)
    console.log('\n' + '='.repeat(60) + '\n')

    if (response.ok) {
      console.log('✅ SUCCESS! API authentication is working!')
      const data = JSON.parse(responseText)
      console.log('HPP URL:', data.url)
    } else {
      console.error('❌ FAILED! Authentication error.')
      console.log('\n💡 Troubleshooting:')
      console.log('1. Verify your API key is correct')
      console.log('2. Check that the key has proper permissions')
      console.log('3. Make sure you copied the full key (no truncation)')
      console.log('4. Try regenerating the key in RunPayments dashboard')
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.log('\n💡 Check:')
    console.log('- API_URL is correct')
    console.log('- Network connection is working')
    console.log('- No firewall blocking the request')
  }
}

testHPP()





