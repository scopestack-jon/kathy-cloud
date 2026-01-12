export default function APIDocPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Kathy Cloud API Documentation</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          <p className="text-gray-700 mb-4">
            All API endpoints (except webhooks) require authentication using a Bearer token:
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            Authorization: Bearer YOUR_API_SECRET_KEY
          </pre>
        </div>

        <div className="space-y-6">
          {/* POST /api/payments */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">POST /api/payments</h3>
            <p className="text-gray-600 mb-4">Create a new payment session</p>
            
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Request Body:</h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "invoiceId": "I-123",
  "amount": 150.00,
  "currency": "USD",
  "practicePantherInvoiceUrl": "https://...",
  "firmId": "optional",
  "userId": "optional"
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Response:</h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "paymentSessionId": "uuid",
  "paymentUrl": "https://checkout.runpayments.com/..."
}`}
              </pre>
            </div>
          </div>

          {/* GET /api/payments/[id]/status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">GET /api/payments/[id]/status</h3>
            <p className="text-gray-600 mb-4">Check payment session status (for polling)</p>
            
            <div>
              <h4 className="font-semibold mb-2">Response:</h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "paymentSessionId": "uuid",
  "status": "paid_pending_consent",
  "invoiceId": "I-123",
  "amount": 150.00,
  "currency": "USD",
  "lastUpdatedAt": "2026-01-05T..."
}`}
              </pre>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Status Values:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><code>initiated</code> - Session created</li>
                <li><code>pending</code> - Awaiting payment</li>
                <li><code>paid_pending_consent</code> - Payment successful, waiting for user confirmation</li>
                <li><code>paid_and_confirmed</code> - Invoice marked as paid</li>
                <li><code>cancelled</code> - User cancelled</li>
                <li><code>failed</code> - Payment failed</li>
                <li><code>manual_review</code> - Requires manual handling</li>
              </ul>
            </div>
          </div>

          {/* POST /api/payments/[id]/confirm */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">POST /api/payments/[id]/confirm</h3>
            <p className="text-gray-600 mb-4">Confirm invoice should be marked as paid</p>
            
            <div>
              <h4 className="font-semibold mb-2">Response:</h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "message": "Payment confirmed and invoice marked as paid"
}`}
              </pre>
            </div>
          </div>

          {/* POST /api/payments/[id]/cancel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">POST /api/payments/[id]/cancel</h3>
            <p className="text-gray-600 mb-4">Cancel payment marking (moves to manual review)</p>
            
            <div>
              <h4 className="font-semibold mb-2">Response:</h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "message": "Payment cancelled and moved to manual review"
}`}
              </pre>
            </div>
          </div>

          {/* POST /api/webhooks/payment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">POST /api/webhooks/payment</h3>
            <p className="text-gray-600 mb-4">RunPayments webhook endpoint (no auth required, uses signature verification)</p>
            
            <div>
              <h4 className="font-semibold mb-2">Headers:</h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                x-runpayments-signature: signature_here
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}





