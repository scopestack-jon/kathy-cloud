# Kathy - Full System Documentation

Complete end-to-end payment consent system for Practice Panther.

## System Overview

Kathy consists of three main components:

1. **Chrome Extension** - Injects payment buttons into Practice Panther UI
2. **Kathy Cloud (Next.js Backend)** - Manages payment sessions and consent tracking
3. **RunPayments Integration** - Hosted payment processing (processor-agnostic)

## Architecture

```
User clicks "Collect with Kathy" in Practice Panther
    ↓
Extension → POST /api/payments → Kathy Cloud
    ↓
Kathy Cloud → Create hosted payment session → RunPayments
    ↓
Extension opens payment URL in new tab
    ↓
User completes payment on RunPayments hosted page
    ↓
RunPayments → Webhook → Kathy Cloud (status: paid_pending_consent)
    ↓
Extension polls → GET /api/payments/[id]/status → Detects payment success
    ↓
Extension shows consent modal: "Mark invoice #I-X as paid for $Y?"
    ↓
User clicks "Confirm" or "Cancel"
    ↓
Confirm → Extension → POST /api/payments/[id]/confirm → Kathy Cloud
    ↓
Extension updates Practice Panther DOM → Invoice marked as PAID
    ↓
Cancel → Extension → POST /api/payments/[id]/cancel → Kathy Cloud
    ↓
Payment stays in Kathy dashboard for manual handling
```

## Setup Instructions

### 1. Set Up Kathy Cloud (Backend)

```bash
cd kathy-cloud

# Install dependencies
npm install

# Configure environment (.env file)
DATABASE_URL="postgresql://user:password@localhost:5432/kathy_cloud"
API_SECRET_KEY="your-secret-key"
RUNPAYMENTS_API_KEY="your-key"
RUNPAYMENTS_WEBHOOK_SECRET="your-webhook-secret"

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

Backend runs at: `http://localhost:3000`

### 2. Build Chrome Extension

```bash
# From project root
cd kathyv3 (extension directory)

# Build extension
npm run build
```

### 3. Configure Extension

Update extension environment (if needed):
- API URL: Defaults to `http://localhost:3000`
- API Key: Defaults to test key (change in production)

### 4. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `kathyv3/build/chrome-mv3-prod`

### 5. Configure RunPayments Webhook

Point RunPayments webhook to:
```
https://your-domain.com/api/webhooks/payment
```

Use webhook secret in your `.env` file.

## Testing the Full Flow

### Option 1: Sandbox Environment

1. Start Kathy Cloud: `cd kathy-cloud && npm run dev`
2. Load extension in Chrome
3. Navigate to Practice Panther invoices page
4. Click "Collect with Kathy" button
5. Payment URL opens (mock/sandbox in development)
6. Simulate webhook success (see below)
7. Consent modal appears in extension
8. Click "Confirm" to mark invoice as paid

### Option 2: Manual Webhook Simulation

After creating a payment session, simulate success:

```bash
# Get the processor_payment_id from the database or logs
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "x-runpayments-signature: test" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_123",
    "type": "payment_succeeded",
    "data": {
      "payment_id": "PROCESSOR_PAYMENT_ID_HERE",
      "amount": 150.00,
      "currency": "USD"
    }
  }'
```

This will transition the payment session to `paid_pending_consent`, triggering the extension's consent modal.

## Security Checklist

- [x] Bearer token authentication for API endpoints
- [x] Webhook signature verification
- [x] No storage of sensitive data (cards, credentials)
- [x] Complete audit trail in database
- [x] User consent required for all invoice marking
- [x] No Practice Panther API access (DOM-only)
- [x] HTTPS required in production

## Status Values

| Status | Description |
|--------|-------------|
| `initiated` | Payment session created |
| `pending` | Awaiting payment |
| `paid_pending_consent` | Payment successful, awaiting user confirmation |
| `paid_and_confirmed` | User confirmed, invoice marked as paid |
| `cancelled` | Cancelled before payment |
| `failed` | Payment failed |
| `manual_review` | User cancelled after payment, requires manual handling |

## Dashboard Access

Visit `http://localhost:3000/dashboard` to:
- View all payment sessions
- See payments requiring manual review
- Check audit logs
- Monitor status counts

## Production Deployment

### Backend (Kathy Cloud)

1. **Deploy to hosting provider:**
   - Vercel (recommended for Next.js)
   - AWS (EC2, ECS, Lambda)
   - Digital Ocean, Heroku, etc.

2. **Set up production database:**
   - PostgreSQL (managed service recommended)
   - Run migrations: `npx prisma migrate deploy`

3. **Configure environment variables:**
   - All production keys and secrets
   - HTTPS API URL

4. **Set up webhook endpoint:**
   - Configure RunPayments to send webhooks to your domain
   - Verify webhook signature validation

### Extension

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Update configuration:**
   - Set production API URL
   - Update API secret key
   - Test thoroughly

3. **Package for Chrome Web Store:**
   ```bash
   npm run package
   ```

4. **Submit to Chrome Web Store:**
   - Create developer account
   - Upload package
   - Provide privacy policy
   - Submit for review

## Troubleshooting

### Extension doesn't show buttons
- Check console for "Kathy:" logs
- Verify you're on Practice Panther invoices page
- Check API connectivity to Kathy Cloud

### API returns 401 Unauthorized
- Verify API_SECRET_KEY matches in both extension and backend
- Check Authorization header format: `Bearer YOUR_KEY`

### Webhook not working
- Verify webhook signature validation
- Check webhook URL is accessible from internet
- Review webhook logs in dashboard

### Payment status stuck in "pending"
- Check if webhook was received (check audit_logs)
- Manually trigger webhook for testing
- Verify processor_payment_id matches

## File Structure

```
kathyv3/
├── src/
│   ├── background.ts              # Background service worker
│   └── contents/
│       └── practice-panther.tsx   # Content script with API integration
├── public/
│   ├── manifest.json              # Extension manifest
│   └── payment-icon.png           # Button icon
└── build/                         # Built extension

kathy-cloud/
├── app/
│   ├── page.tsx                   # Home page
│   ├── dashboard/                 # Dashboard pages
│   └── api/
│       ├── payments/              # Payment endpoints
│       └── webhooks/              # Webhook handlers
├── lib/
│   ├── prisma.ts                  # Database client
│   ├── auth.ts                    # Authentication
│   ├── runpayments.ts             # Payment processor integration
│   └── logger.ts                  # Logging utility
└── prisma/
    └── schema.prisma              # Database schema
```

## API Reference

See `/api` page in the dashboard or [Kathy Cloud README](kathy-cloud/README.md) for complete API documentation.

## Support

For issues:
1. Check console logs (prefix: "Kathy:" or "Kathy Cloud:")
2. View dashboard for payment status
3. Check audit_logs table for complete history
4. Review this documentation

## License

ISC





