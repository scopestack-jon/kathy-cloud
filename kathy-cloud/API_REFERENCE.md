# Kathy Cloud API Reference

Complete API documentation for the Kathy Cloud backend.

## Base URL

```
Development: http://localhost:3000
Production: https://your-kathy-cloud-domain.com
```

## Authentication

All API endpoints require authentication via Bearer token:

```
Authorization: Bearer {API_SECRET_KEY}
```

Set `API_SECRET_KEY` in your `.env` file.

---

## Endpoints

### Payment Management

#### Create Payment Session

Create a new payment session for an invoice.

```http
POST /api/payments
Content-Type: application/json
Authorization: Bearer {API_SECRET_KEY}

{
  "invoiceId": "I-123",
  "amount": 25000,
  "currency": "USD",
  "practicePantherInvoiceUrl": "https://app.practicepanther.com/..."
}
```

**Response:**
```json
{
  "paymentSessionId": "uuid",
  "paymentUrl": "https://checkout.runpayments-ab.io/...",
  "status": "pending"
}
```

#### Check Payment Status

Poll for payment status updates.

```http
GET /api/payments/{paymentSessionId}/status
Authorization: Bearer {API_SECRET_KEY}
```

**Response:**
```json
{
  "status": "paid_pending_consent",
  "invoiceId": "I-123",
  "amount": 25000,
  "updatedAt": "2024-01-08T..."
}
```

**Possible statuses:**
- `pending`: Payment not yet completed
- `paid_pending_consent`: Payment successful, awaiting user confirmation
- `confirmed`: User confirmed payment
- `cancelled_by_user`: User cancelled during consent flow
- `cancelled_by_kathy`: Manually cancelled in Kathy dashboard
- `failed`: Payment failed

#### Confirm Payment

Mark payment as confirmed after user consent.

```http
POST /api/payments/{paymentSessionId}/confirm
Authorization: Bearer {API_SECRET_KEY}
```

**Response:**
```json
{
  "success": true,
  "status": "confirmed"
}
```

#### Cancel Payment

Cancel payment and move to manual review.

```http
POST /api/payments/{paymentSessionId}/cancel
Authorization: Bearer {API_SECRET_KEY}
```

**Response:**
```json
{
  "success": true,
  "status": "cancelled_by_user"
}
```

---

### Entity Management

#### Get Entity Data

Fetch enriched data for any entity (invoice, contact, company).

```http
GET /api/entities/{type}/{id}
Authorization: Bearer {API_SECRET_KEY}
```

**Path Parameters:**
- `type`: Entity type (`invoice`, `contact`, `company`)
- `id`: Entity identifier (e.g., `I-123`)

**Response for invoices:**
```json
{
  "type": "invoice",
  "id": "I-123",
  "data": {
    "invoiceId": "I-123",
    "paymentSessions": [
      {
        "id": "uuid",
        "amount": 25000,
        "status": "confirmed",
        "createdAt": "2024-01-08T...",
        "updatedAt": "2024-01-08T...",
        "paymentUrl": "https://...",
        "processorPaymentId": "ch_..."
      }
    ],
    "auditLogs": [
      {
        "id": "uuid",
        "event": "payment.confirmed",
        "metadata": {...},
        "createdAt": "2024-01-08T..."
      }
    ],
    "summary": {
      "totalPaid": 25000,
      "totalSessions": 3,
      "latestStatus": "confirmed",
      "lastUpdated": "2024-01-08T..."
    }
  }
}
```

**Response for contacts (placeholder):**
```json
{
  "type": "contact",
  "id": "contact-123",
  "data": {
    "message": "Contact enrichment coming soon"
  }
}
```

---

### Actions

#### Trigger Action

Execute actions on entities (workflows, notes, etc.).

```http
POST /api/actions
Content-Type: application/json
Authorization: Bearer {API_SECRET_KEY}

{
  "action": "add_to_sequence",
  "entityType": "invoice",
  "entityId": "I-123",
  "metadata": {
    "sequenceId": "seq-456",
    "customField": "value"
  }
}
```

**Available Actions:**

| Action | Description | Response |
|--------|-------------|----------|
| `add_to_sequence` | Add entity to workflow sequence | `{ success: true, message: "Added..." }` |
| `create_note` | Create a note for entity | `{ success: true, noteId: "note_..." }` |
| `sync_to_crm` | Sync entity to external CRM | `{ success: true, message: "Synced..." }` |
| `mark_as_reviewed` | Mark entity as reviewed | `{ success: true, message: "Marked..." }` |

**Response:**
```json
{
  "success": true,
  "message": "Added invoice I-123 to sequence",
  "action": "add_to_sequence"
}
```

---

### Webhooks

#### RunPayments Webhook

Receive payment status updates from RunPayments.

```http
POST /api/webhooks/payment
Content-Type: application/json
X-Webhook-Signature: {signature}

{
  "id": "evt_...",
  "type": "payment_intent.succeeded",
  "data": {
    "id": "pi_...",
    "amount": 25000,
    "currency": "usd",
    "status": "succeeded",
    "metadata": {
      "invoice": "I-123"
    }
  }
}
```

**Webhook Events:**
- `payment_intent.succeeded`: Payment successful
- `payment_intent.payment_failed`: Payment failed
- `charge.succeeded`: Charge completed
- `charge.failed`: Charge failed

**Response:**
```json
{
  "received": true
}
```

---

## Error Responses

All endpoints return standard HTTP status codes:

**400 Bad Request**
```json
{
  "error": "Invalid request parameters"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limits. Production deployments should implement rate limiting based on:
- Per API key: 1000 requests/hour
- Per IP: 100 requests/minute

---

## CORS

The API allows cross-origin requests from all origins (`Access-Control-Allow-Origin: *`). In production, restrict to your extension's origin.

---

## Audit Logging

All actions are automatically logged to the `audit_logs` table with:
- Event name (e.g., `payment.confirmed`)
- Metadata (invoice ID, amount, etc.)
- Timestamp

Query audit logs via the entities endpoint or directly from the database.

---

## Database Schema

### PaymentSession

```prisma
model PaymentSession {
  id                  String        @id @default(uuid())
  invoiceId           String
  amount              Int
  currency            String        @default("USD")
  status              PaymentStatus @default(pending)
  paymentUrl          String?
  processorPaymentId  String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}

enum PaymentStatus {
  pending
  paid_pending_consent
  confirmed
  cancelled_by_user
  cancelled_by_kathy
  failed
}
```

### AuditLog

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  event     String
  metadata  Json?
  createdAt DateTime @default(now())
}
```

---

## Example Workflows

### Complete Payment Flow

```javascript
// 1. Create payment session
const { paymentSessionId, paymentUrl } = await fetch('/api/payments', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' },
  body: JSON.stringify({ invoiceId: 'I-123', amount: 25000, currency: 'USD' })
}).then(r => r.json())

// 2. Open payment URL
window.open(paymentUrl, '_blank')

// 3. Poll for status
const interval = setInterval(async () => {
  const { status } = await fetch(`/api/payments/${paymentSessionId}/status`, {
    headers: { 'Authorization': 'Bearer ...' }
  }).then(r => r.json())
  
  if (status === 'paid_pending_consent') {
    clearInterval(interval)
    // Show consent modal
  }
}, 3000)

// 4. On user confirmation
await fetch(`/api/payments/${paymentSessionId}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' }
})
```

### Fetch Entity Data

```javascript
const entity = await fetch('/api/entities/invoice/I-123', {
  headers: { 'Authorization': 'Bearer ...' }
}).then(r => r.json())

console.log('Total paid:', entity.data.summary.totalPaid)
console.log('Payment sessions:', entity.data.paymentSessions.length)
```

### Trigger Action

```javascript
await fetch('/api/actions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'mark_as_reviewed',
    entityType: 'invoice',
    entityId: 'I-123'
  })
})
```

---

## Development

### Setup

```bash
cd kathy-cloud
npm install
npx prisma generate
npx prisma dev --name kathy  # Start dev database
npm run dev                   # Start Next.js server
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# API
API_SECRET_KEY="dev-secret-key-change-in-production"

# RunPayments
RUNPAYMENTS_API_URL="https://api.sandbox.runpayments-ab.io"
RUNPAYMENTS_API_KEY="your-api-key"
RUNPAYMENTS_MERCHANT_ID="your-merchant-id"
RUNPAYMENTS_SOURCE_KEY="your-source-key"
RUNPAYMENTS_WEBHOOK_SECRET="your-webhook-secret"
RUNPAYMENTS_MODE="sandbox"
SKIP_WEBHOOK_VERIFICATION="true"
```

### Testing with cURL

```bash
# Create payment
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer dev-secret-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"I-TEST","amount":10000,"currency":"USD"}'

# Check status
curl http://localhost:3000/api/payments/{id}/status \
  -H "Authorization: Bearer dev-secret-key-change-in-production"

# Get entity
curl http://localhost:3000/api/entities/invoice/I-TEST \
  -H "Authorization: Bearer dev-secret-key-change-in-production"
```

---

## Support

For API issues or questions, contact the development team or file an issue.




