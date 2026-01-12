# Kathy Cloud - Backend API

Next.js backend for the Kathy payment consent layer system.

## Features

- **Payment Session Management**: Create and track payment sessions
- **RunPayments Integration**: Generate hosted payment links
- **Webhook Handling**: Process payment processor webhooks
- **Consent Tracking**: Require explicit user confirmation before marking invoices as paid
- **Audit Logging**: Complete audit trail of all actions
- **Dashboard**: View and manage payment sessions

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Bearer token (simple, can be upgraded to JWT)
- **Payment Processor**: RunPayments (processor-agnostic design)

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- RunPayments account (optional for testing - uses mocks)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/kathy_cloud"
API_SECRET_KEY="your-secret-key-here"
RUNPAYMENTS_API_KEY="your-key"
RUNPAYMENTS_API_URL="https://api.runpayments.com"
RUNPAYMENTS_WEBHOOK_SECRET="your-webhook-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

3. **Run database migrations:**
```bash
npx prisma migrate dev --name init
```

4. **Generate Prisma client:**
```bash
npx prisma generate
```

5. **Start development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### POST /api/payments
Create a new payment session

**Request:**
```json
{
  "invoiceId": "I-123",
  "amount": 150.00,
  "currency": "USD",
  "practicePantherInvoiceUrl": "https://...",
  "firmId": "optional",
  "userId": "optional"
}
```

**Response:**
```json
{
  "paymentSessionId": "uuid",
  "paymentUrl": "https://checkout.runpayments.com/..."
}
```

### GET /api/payments/[id]/status
Check payment status (for polling)

**Response:**
```json
{
  "paymentSessionId": "uuid",
  "status": "paid_pending_consent",
  "invoiceId": "I-123",
  "amount": 150.00,
  "currency": "USD",
  "lastUpdatedAt": "2026-01-05T..."
}
```

### POST /api/payments/[id]/confirm
Confirm invoice should be marked as paid

**Response:**
```json
{
  "success": true,
  "message": "Payment confirmed and invoice marked as paid"
}
```

### POST /api/payments/[id]/cancel
Cancel payment marking (moves to manual review)

**Response:**
```json
{
  "success": true,
  "message": "Payment cancelled and moved to manual review"
}
```

### POST /api/webhooks/payment
RunPayments webhook endpoint (uses signature verification)

## Database Schema

### payment_sessions
- `id` (UUID)
- `invoice_id` (string)
- `amount` (decimal)
- `currency` (string)
- `status` (enum)
- `practice_panther_invoice_url` (string)
- `firm_id` (string, optional)
- `user_id` (string, optional)
- `processor_payment_id` (string)
- `payment_url` (string)
- `created_at`, `updated_at`

### audit_logs
- `id` (UUID)
- `payment_session_id` (FK)
- `action` (string)
- `actor` (string)
- `timestamp`
- `metadata` (JSONB)

## Status Flow

1. **initiated** → Payment session created
2. **pending** → Awaiting payment
3. **paid_pending_consent** → Payment successful, awaiting user confirmation
4. **paid_and_confirmed** → User confirmed, invoice marked as paid
5. **manual_review** → User cancelled, requires manual handling
6. **failed** → Payment failed
7. **cancelled** → Cancelled before payment

## Dashboard

Visit `/dashboard` to view:
- Payment sessions by status
- Recent transactions
- Payments requiring manual review
- Audit logs

## Security

- Bearer token authentication for all API endpoints
- Webhook signature verification for RunPayments
- No sensitive data storage
- Complete audit trail

## Development

```bash
# Run development server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Testing

1. **Test payment creation:**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"I-TEST","amount":100.00}'
```

2. **Simulate webhook (mock payment success):**
```bash
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "x-runpayments-signature: test" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test",
    "type": "payment_succeeded",
    "data": {
      "payment_id": "PROCESSOR_PAYMENT_ID",
      "amount": 100.00,
      "currency": "USD"
    }
  }'
```

3. **Check status:**
```bash
curl http://localhost:3000/api/payments/PAYMENT_SESSION_ID/status \
  -H "Authorization: Bearer your-secret-key"
```

## Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `npx prisma migrate deploy`
4. Deploy to your hosting provider (Vercel, AWS, etc.)
5. Update Chrome extension with production API URL

## License

ISC
