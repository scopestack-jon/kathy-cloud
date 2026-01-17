// Quick test script to verify RunPayments Access Token
// Usage: node test-token.js <your-access-token>

const accessToken = process.argv[2] || process.env.RUNPAYMENTS_API_KEY
const ccMid = process.env.RUNPAYMENTS_CC_MID || '800000004181'

if (!accessToken) {
  console.error('❌ Please provide an Access Token:')
  console.error('   node test-token.js <your-access-token>')
  console.error('   OR set RUNPAYMENTS_API_KEY in .env')
  process.exit(1)
}

console.log('🔍 Testing RunPayments Access Token...\n')
console.log('Access Token:', accessToken.substring(0, 20) + '...')
console.log('CC MID:', ccMid)
console.log('\n' + '='.repeat(60) + '\n')

async function testToken() {
  try {
    const hppApiUrl = 'https://javelin.runpayments.io/api/v1/hpp'
    
    const payload = {
      name: "Test Payment Page",
      cc_mid: ccMid,
      amount: "10.00",
      lock_amount: true,
      disable_after_payment: true,
      hpp_options: [
        {
          name: 'invoice_id',
          value: 'TEST-123',
          is_readonly: true
        }
      ]
    }

    console.log('Request:')
    console.log(`POST ${hppApiUrl}`)
    console.log('Headers:')
    console.log(`  Authorization: Bearer ${accessToken.substring(0, 20)}...`)
    console.log('Body:', JSON.stringify(payload, null, 2))
    console.log('\n' + '='.repeat(60) + '\n')

    const response = await fetch(hppApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text()
    
    console.log('Response:')
    console.log('- Status:', response.status, response.statusText)
    console.log('- Body:', responseText)
    console.log('\n' + '='.repeat(60) + '\n')

    if (response.ok) {
      console.log('✅ SUCCESS! Access Token is valid!')
      const data = JSON.parse(responseText)
      console.log('HPP URL:', data.url)
      console.log('\n✅ You can use this Access Token in production!')
    } else {
      console.error('❌ FAILED! Access Token is invalid or expired.')
      console.log('\n💡 Next steps:')
      console.log('1. Get a fresh Access Token from RunPayments dashboard')
      console.log('2. Make sure the token has proper permissions')
      console.log('3. Verify the token is for the correct environment (sandbox/production)')
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message)
  }
}

testToken()
