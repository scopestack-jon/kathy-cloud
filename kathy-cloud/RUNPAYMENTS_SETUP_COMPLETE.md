# ✅ RunPayments Setup Complete

## How It Works

Kathy now uses **RunPayments' hosted payment page** with URL parameters. This is simpler and doesn't require complex API calls.

### What Happens When User Clicks "Collect with Kathy"

1. **Extension** → Sends invoice data to Kathy Cloud
   ```javascript
   POST /api/payments
   { invoiceId: "I-123", amount: 12500 }
   ```

2. **Kathy Cloud** → Generates a payment URL
   ```
   https://pay.sandbox.runpayments-ab.io/capture?source_key=XXX&amount=125.00&invoice=I-123
   ```

3. **Extension** → Opens the URL in a new tab for the user to pay

4. **User** → Completes payment on RunPayments' hosted page

5. **RunPayments** → Sends webhook to Kathy Cloud
   ```
   POST /api/webhooks/payment
   ```

6. **Kathy Cloud** → Updates payment status to "completed"

7. **Extension** → Polls for status, shows consent modal when paid

8. **User** → Clicks "Confirm"

9. **Extension** → Marks invoice as paid in Practice Panther UI

## Current Configuration

Your `.env` file should have:

```bash
RUNPAYMENTS_MODE="runpayments"
RUNPAYMENTS_API_URL="https://api.sandbox.runpayments-ab.io"  # Not used with URL approach
RUNPAYMENTS_API_KEY="your_source_key_here"  # Used in payment URL
RUNPAYMENTS_MERCHANT_ID="your_merchant_id"  # Optional
RUNPAYMENTS_WEBHOOK_SECRET="your_webhook_secret"  # For webhook verification
```

## Testing

1. **Go to Practice Panther invoices page**
2. **Click "Collect with Kathy"** on any invoice
3. **A new tab should open** with the RunPayments payment form
4. **The amount and invoice # should be visible** in the URL
5. **Complete the test payment** using RunPayments' test card numbers
6. **The extension will detect payment** and show the consent modal

## Next Steps

- If the payment URL opens successfully, the integration is working!
- You can configure your actual webhook endpoint in RunPayments dashboard
- For production, change to the production payment URL

## Production URLs

When ready for production, update the code to use:
```
https://pay.runpayments-ab.io/capture
```





