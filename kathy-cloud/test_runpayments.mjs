// Test RunPayments API to find transactions
const apiKey = 'tkn_ppc_LY9P3WrNMeG46LkWRzF4PXDS5zVRDj'
const paymentSessionId = '03b48bb8-ba60-4d88-80fd-d4a7dfdd4acb'

console.log('Testing RunPayments API...')
console.log(`API Key: ${apiKey.substring(0, 15)}...`)
console.log(`Payment Session ID: ${paymentSessionId}`)
console.log('')

async function testAPI() {
  // Extract client_id from payment URL
  const clientId = 'D105E7252CB3DD7C31FDA4E7EC156561'

  // Try different endpoints to query HPP status
  const endpoints = [
    `https://javelin.runpayments.io/api/v1/hpp/${clientId}`,
    `https://javelin.runpayments.io/api/v1/hpp/${clientId}/status`,
    `https://javelin.runpayments.io/api/v1/hpp/payment/${clientId}`,
    'https://javelin.runpayments.io/api/v1/transactions',
    'https://javelin.runpayments.io/api/v1/payments',
    'https://javelin.runpayments.io/api/v1/hpp/transactions'
  ]

  for (const endpoint of endpoints) {
    console.log(`\n=== Testing: ${endpoint} ===`)

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      console.log(`Status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log('Response type:', typeof data)
        console.log('Response keys:', Object.keys(data || {}).slice(0, 10))

        // Check if it's paginated
        if (data.results || data.transactions || data.data) {
          const items = data.results || data.transactions || data.data
          console.log(`Found ${items.length} items`)

          if (items.length > 0) {
            console.log('\nFirst item structure:')
            console.log(JSON.stringify(items[0], null, 2).substring(0, 500))
          }
        } else if (Array.isArray(data)) {
          console.log(`Found ${data.length} items (array)`)

          if (data.length > 0) {
            console.log('\nFirst item structure:')
            console.log(JSON.stringify(data[0], null, 2).substring(0, 500))
          }
        } else {
          console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500))
        }
      } else {
        const errorText = await response.text()
        console.log('Error:', errorText.substring(0, 200))
      }
    } catch (error) {
      console.log('Request failed:', error.message)
    }
  }
}

testAPI().catch(console.error)
