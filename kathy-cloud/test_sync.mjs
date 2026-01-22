// Test SmartMoving sync manually
import { syncPaymentToSmartMoving } from './lib/smartmoving-sync.js'

const paymentSessionId = 'e2c3f705-3539-49db-9e7b-34c653616c4e'

console.log('Testing SmartMoving sync for payment:', paymentSessionId)
console.log('')

try {
  await syncPaymentToSmartMoving(paymentSessionId)
  console.log('Sync completed (check audit logs for results)')
} catch (error) {
  console.error('Sync error:', error.message)
  console.error('Stack:', error.stack)
}
