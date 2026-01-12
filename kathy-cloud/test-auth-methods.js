// Test different authentication methods for RunPayments
require('dotenv').config()

const apiUrl = process.env.RUNPAYMENTS_API_URL
const apiKey = process.env.RUNPAYMENTS_API_KEY
const merchantId = process.env.RUNPAYMENTS_MERCHANT_ID

console.log('🧪 Testing Different Authentication Methods\n')

const testMethods = [
  {
    name: 'Bearer Token (standard)',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Basic Auth',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'X-API-Key Header',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Source-Key Header',
    headers: {
      'Source-Key': apiKey,
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Token Header',
    headers: {
      'Token': apiKey,
      'Content-Type': 'application/json'
    }
  }
]

async function testAuth(method) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${method.name}`)
  console.log('='.repeat(60))
  
  try {
    const response = await fetch(`${apiUrl}/api/v1/hpp`, {
      method: 'POST',
      headers: method.headers,
      body: JSON.stringify({
        name: "Test",
        cc_mid: merchantId,
        amount: "10.00"
      })
    })

    console.log(`Status: ${response.status} ${response.statusText}`)
    
    if (response.status === 401) {
      console.log('❌ Still unauthorized')
    } else if (response.status === 400) {
      console.log('⚠️  Bad request (but auth might be OK!)')
      const text = await response.text()
      console.log('Response:', text.substring(0, 200))
    } else if (response.ok) {
      console.log('✅ SUCCESS!')
      const data = await response.json()
      console.log('Response:', data)
    } else {
      console.log('Status:', response.status)
      const text = await response.text()
      console.log('Response:', text.substring(0, 200))
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

async function runTests() {
  for (const method of testMethods) {
    await testAuth(method)
    await new Promise(resolve => setTimeout(resolve, 500)) // Small delay between tests
  }
  
  console.log(`\n${'='.repeat(60)}`)
  console.log('Tests complete!')
  console.log('='.repeat(60) + '\n')
}

runTests()

