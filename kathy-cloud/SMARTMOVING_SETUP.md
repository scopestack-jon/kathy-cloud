# SmartMoving Integration Setup

This document describes how to configure the SmartMoving API integration for automatic payment reconciliation and deposit tracking.

## Overview

The SmartMoving integration enables:
- **Pre-populated payment links** - Generate payment forms with customer data from SmartMoving estimates
- **Automatic payment reconciliation** - Sync payment details to SmartMoving job accounting notes
- **Job confirmation** - Auto-confirm jobs with category when deposits are received
- **Audit trail** - Complete logging of all sync attempts

## Organization Settings Configuration

SmartMoving settings are stored in the `Organization.settings` JSONB field with the following structure:

```json
{
  "smartMoving": {
    "apiKey": "sm_live_abc123...",
    "clientId": "client_xyz789...",
    "enabled": true,
    "ccProcessingFeePercent": 2.75,
    "confirmCategory": "deposit"
  }
}
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | Yes | SmartMoving API key (x-api-key header) |
| `clientId` | string | Yes | SmartMoving client ID (x-client-id header) |
| `enabled` | boolean | Yes | Feature flag to enable/disable integration |
| `ccProcessingFeePercent` | number | No | Credit card processing fee % (default: 2.75) |
| `confirmCategory` | string | No | Job confirmation category (default: "deposit") |

## Getting SmartMoving API Credentials

1. Log in to your SmartMoving account
2. Navigate to Settings → Integrations → API
3. Generate a new API key and client ID
4. Copy the credentials (they won't be shown again)

## Setting Up an Organization

You can configure SmartMoving for an organization using SQL or via API:

### Option 1: Direct SQL Update

```sql
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{smartMoving}',
  '{
    "apiKey": "sm_live_your_api_key",
    "clientId": "your_client_id",
    "enabled": true,
    "ccProcessingFeePercent": 2.75,
    "confirmCategory": "deposit"
  }'::jsonb
)
WHERE slug = 'your-org-slug';
```

### Option 2: Via API (Future)

```typescript
// POST /api/organizations/{id}/settings/smartmoving
{
  "apiKey": "sm_live_your_api_key",
  "clientId": "your_client_id",
  "enabled": true,
  "ccProcessingFeePercent": 2.75,
  "confirmCategory": "deposit"
}
```

## PaymentSession Metadata

When a payment is linked to a SmartMoving opportunity, the following metadata is stored in the `PaymentSession.metadata` field:

```json
{
  "smartMoving": {
    "opportunityId": "uuid-of-opportunity",
    "jobId": "uuid-of-job",
    "quoteNumber": "35219",
    "syncedAt": "2026-01-21T21:45:00Z",
    "leadStatus": "Deposit Pending"
  }
}
```

## Payment Flow

### 1. Generate Pre-Populated Payment Link

Sales person in SmartMoving:
1. Creates estimate for customer
2. Clicks "Generate Kathy Payment Link" (via extension)
3. Kathy fetches estimate data from SmartMoving API
4. Calculates total with processing fee
5. Creates RunPayments session with pre-filled data
6. Returns payment link to sales person

### 2. Customer Pays

Customer receives link and pays:
1. Payment form shows pre-filled name, email, amount
2. Customer only enters credit card details
3. Payment processed via RunPayments
4. Webhook triggers Kathy Cloud

### 3. Automatic Sync to SmartMoving

Kathy Cloud webhook handler:
1. Receives payment confirmation from RunPayments
2. Looks up SmartMoving configuration for organization
3. Searches SmartMoving for opportunity (by email or opportunityId)
4. Updates job accounting notes with payment details
5. Confirms job with category (e.g., "deposit")
6. Logs sync status to audit trail

## SmartMoving API Endpoints Used

The integration uses the following SmartMoving Public API v1 endpoints:

```
GET /api/opportunities/{opportunityId}
  - Fetch opportunity details with customer data and estimate

GET /api/leads?EmailAddress={email}
  - Search for opportunities by customer email

GET /api/opportunities/{opportunityId}/jobs
  - Get jobs for an opportunity

PATCH /api/premium/opportunities/{opportunityId}/jobs/{jobId}/notes
  - Update job accounting/customer/crew notes

POST /api/premium/opportunities/{opportunityId}/jobs/{jobId}/confirm?category={category}
  - Confirm job with category (deposit, balance, etc.)
```

## Payment Note Format

When a payment is synced to SmartMoving, the following note is added to the job's `accountingNotes`:

```
PAYMENT RECEIVED via Kathy
━━━━━━━━━━━━━━━━━━━━━━━━━━
Estimate Amount: $952.75
Processing Fee: $26.19 (2.75%)
Total Paid: $977.94
━━━━━━━━━━━━━━━━━━━━━━━━━━
Quote #: 35219
Invoice: INV-35219-001
Gateway: rp_abc123def456
Date: 2026-01-21 21:45:30 UTC
Customer: jon@kathy.dev
━━━━━━━━━━━━━━━━━━━━━━━━━━
Processed via RunPayments integration
Auto-synced by Kathy Cloud
```

## Audit Log Actions

The following audit log actions are created for SmartMoving integration:

| Action | Description |
|--------|-------------|
| `smartmoving_sync_started` | Initial sync attempt started |
| `smartmoving_sync_success` | Successful sync with opportunityId/jobId |
| `smartmoving_sync_failed` | Sync failed with error details |
| `smartmoving_opportunity_not_found` | Customer email not found in SmartMoving |
| `smartmoving_config_missing` | Organization not configured for SmartMoving |

### Example Audit Log Metadata

```json
{
  "action": "smartmoving_sync_success",
  "metadata": {
    "opportunityId": "uuid",
    "jobId": "uuid",
    "quoteNumber": "35219",
    "leadStatus": "Deposit Pending",
    "accountingNotes": "PAYMENT: $500...",
    "paymentAmount": 500.00,
    "invoiceId": "INV-123",
    "syncDuration": 1234
  }
}
```

## Error Handling

The SmartMoving integration is designed to be **non-blocking**:

- ✅ Payment succeeds even if SmartMoving sync fails
- ✅ Errors are logged to audit trail
- ✅ Failed syncs can be retried manually
- ✅ Retry logic with exponential backoff (3 attempts)

### Common Error Scenarios

1. **SmartMoving not configured** - Sync silently skipped, no error
2. **Invalid API credentials** - Error logged, payment still succeeds
3. **Customer not found in SmartMoving** - Warning logged, payment succeeds
4. **Transient API failure** - 3 retry attempts with backoff
5. **Multiple jobs per opportunity** - All jobs updated with payment notes

## Testing the Integration

### 1. Configure Test Organization

```sql
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{smartMoving}',
  '{
    "apiKey": "sm_test_your_test_api_key",
    "clientId": "test_client_id",
    "enabled": true,
    "ccProcessingFeePercent": 2.75,
    "confirmCategory": "deposit"
  }'::jsonb
)
WHERE slug = 'test-org';
```

### 2. Generate Payment Link

```bash
# POST /api/payment-sessions/from-smartmoving
curl -X POST http://localhost:3000/api/payment-sessions/from-smartmoving \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "sm-opportunity-id",
    "organizationId": "org-uuid"
  }'
```

### 3. Trigger Test Webhook

```bash
# POST /api/webhooks/payment
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.succeeded",
    "data": {
      "paymentSessionId": "session-uuid",
      "amount": 977.94,
      "currency": "USD",
      "customerEmail": "test@example.com"
    }
  }'
```

### 4. Verify in SmartMoving

1. Log in to SmartMoving
2. Find the test opportunity
3. View job details
4. Check accounting notes for payment details
5. Verify job is confirmed
6. Check leadStatus changed to "Deposit Pending"

## Troubleshooting

### Payment not syncing to SmartMoving

1. Check organization has SmartMoving configured:
   ```sql
   SELECT settings->'smartMoving' FROM organizations WHERE slug = 'your-org';
   ```

2. Check audit logs for errors:
   ```sql
   SELECT * FROM audit_logs
   WHERE action LIKE 'smartmoving%'
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

3. Verify API credentials are valid:
   ```bash
   curl https://api-public.smartmoving.com/v1/api/leads \
     -H "x-api-key: your-api-key" \
     -H "x-client-id: your-client-id"
   ```

### Customer not found in SmartMoving

The integration searches by email address. Ensure:
- Customer email in SmartMoving matches payment email
- Email is properly formatted (no extra spaces)
- Customer has at least one opportunity (not just a lead)

### Processing fee calculation incorrect

Check organization settings:
```sql
SELECT settings->'smartMoving'->'ccProcessingFeePercent'
FROM organizations
WHERE slug = 'your-org';
```

Default is 2.75% if not specified.

## Security Considerations

- ✅ API keys stored encrypted in database
- ✅ API keys never exposed to client-side code
- ✅ All API requests server-side only
- ✅ Webhook signature verification required
- ✅ Audit logging for compliance

## Future Enhancements

- 🔲 Admin UI for configuration (no SQL required)
- 🔲 Manual retry button for failed syncs
- 🔲 Bidirectional sync (pull job data from SmartMoving)
- 🔲 Support for balance payments (category=balance)
- 🔲 Auto-booking when SmartMoving API supports it
- 🔲 Dashboard showing sync status

## Support

For issues with SmartMoving integration:
1. Check audit logs for error details
2. Verify configuration settings
3. Test API credentials directly
4. Contact SmartMoving support for API issues
