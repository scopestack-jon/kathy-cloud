# Kathy System - Testing Guide

Complete guide for testing the full end-to-end Kathy payment consent flow.

## Prerequisites

- Chrome 120+ with Developer Mode enabled
- Node.js 18+
- PostgreSQL database running
- Kathy Cloud backend running
- Chrome extension loaded

## Setup for Testing

### 1. Start Kathy Cloud Backend

```bash
cd kathy-cloud

# Ensure .env is configured
# DATABASE_URL, API_SECRET_KEY, etc.

# Run migrations if not done
npx prisma migrate dev

# Start development server
npm run dev
```

Backend should be running at `http://localhost:3000`

### 2. Load Chrome Extension

```bash
cd kathyv3 (extension directory)

# Build if not already built
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `build/chrome-mv3-prod` directory

## Test Scenarios

### Scenario 1: Happy Path (Full Success Flow)

**Goal**: Test the complete flow from button click to invoice marked as paid.

1. **Navigate to Practice Panther**
   - Go to `https://app.practicepanther.com/invoices`
   - Open DevTools Console (Cmd+Option+J)
   - Look for `"Kathy: Extension loaded"` log

2. **Verify Button Injection**
   - Look for green "Collect with Kathy" buttons next to invoice statuses
   - Buttons should only appear for invoices with balance > $0
   - Console should show `"Kathy: Injected button for invoice I-X"`

3. **Click Payment Button**
   - Click "Collect with Kathy" on any invoice
   - Button should change to "Processing..."
   - Console should show `"Kathy: Creating payment session"`

4. **Verify Payment Session Created**
   - Alert should appear: `"Payment for Invoice #I-X ($Y.YY)..."`
   - New tab should open with payment URL (mock in dev)
   - Console should show `"Kathy: Payment session created"`
   - Button text should change to "Waiting for payment..."

5. **Check Backend**
   - Go to `http://localhost:3000/dashboard`
   - Verify payment session appears with status "pending"

6. **Simulate Payment Success**
   Open a terminal and run:
   ```bash
   # Get the processor_payment_id from the dashboard or console logs
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

7. **Verify Status Polling**
   - Console should show `"Kathy: Payment status check"` logs every 3 seconds
   - After webhook, console should show `"Kathy: Payment successful, showing consent modal"`

8. **Consent Modal Appears**
   - Modal should overlay the page
   - Text should read: `"Mark invoice #I-X as paid for $Y.YY?"`
   - Two buttons: [Cancel] and [Confirm]

9. **Click Confirm**
   - Modal should close
   - Console should show `"Kathy: Payment confirmed and invoice marked as paid"`
   - Invoice status cell should turn green and show "PAID"
   - Button should show "Paid" and turn darker green

10. **Verify Backend**
    - Refresh dashboard
    - Payment session should have status "paid_and_confirmed"
    - Audit log should show "mark_paid" action

**Expected Result**: ✅ Invoice successfully marked as paid with full audit trail

---

### Scenario 2: User Cancels After Payment

**Goal**: Test the cancellation flow where payment succeeds but user declines consent.

Follow steps 1-8 from Scenario 1, then:

1. **Click Cancel** (instead of Confirm)
   - Modal should close
   - Console should show `"Kathy: Payment cancelled by user"`
   - Invoice status should **NOT** change
   - Button should return to "Collect with Kathy"

2. **Verify Backend**
   - Go to dashboard
   - Payment session should have status "manual_review"
   - Should appear in "Payments Requiring Manual Review" section
   - Audit log should show "cancel_after_payment" action

**Expected Result**: ✅ Payment collected but invoice not marked, available for manual handling

---

### Scenario 3: Payment Failure

**Goal**: Test handling of failed payments.

Follow steps 1-5 from Scenario 1, then:

1. **Simulate Payment Failure**
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/payment \
     -H "x-runpayments-signature: test" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "evt_test_456",
       "type": "payment_failed",
       "data": {
         "payment_id": "PROCESSOR_PAYMENT_ID_HERE",
         "amount": 150.00,
         "currency": "USD"
       }
     }'
   ```

2. **Verify Extension Behavior**
   - Console should detect failed status
   - Alert should appear: `"Payment failed. Please try again."`
   - Button should return to "Collect with Kathy"
   - Button should be enabled again

3. **Verify Backend**
   - Dashboard should show status "failed"

**Expected Result**: ✅ Graceful handling of payment failure

---

### Scenario 4: API Connection Failure

**Goal**: Test extension behavior when backend is unavailable.

1. **Stop Kathy Cloud Backend**
   - Stop the `npm run dev` process

2. **Try to Create Payment**
   - Click "Collect with Kathy" button
   - Console should show `"Kathy: Error creating payment session"`
   - Alert should appear: `"Failed to initiate payment..."`
   - Button should return to enabled state

**Expected Result**: ✅ Graceful error handling with user feedback

---

### Scenario 5: DOM Structure Validation

**Goal**: Test that extension handles unexpected DOM changes safely.

1. **Modify Table Structure** (simulate Practice Panther UI update)
   - Use DevTools to remove a table cell
   - Or change row structure

2. **Trigger Re-scan**
   - Navigate to different page and back to invoices
   - Or wait for SPA navigation detection

3. **Verify Safe Behavior**
   - Console should show `"Kathy: DOM structure changed - contact support"`
   - No buttons injected for malformed rows
   - No JavaScript errors

**Expected Result**: ✅ Safe degradation with clear logging

---

## API Testing

### Test Payment Creation

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "I-TEST-001",
    "amount": 250.00,
    "currency": "USD",
    "practicePantherInvoiceUrl": "https://test.com"
  }'
```

**Expected Response:**
```json
{
  "paymentSessionId": "uuid-here",
  "paymentUrl": "https://checkout.runpayments.com/session/..."
}
```

### Test Status Endpoint

```bash
curl http://localhost:3000/api/payments/PAYMENT_SESSION_ID/status \
  -H "Authorization: Bearer your-secret-key-here"
```

**Expected Response:**
```json
{
  "paymentSessionId": "uuid",
  "status": "pending",
  "invoiceId": "I-TEST-001",
  "amount": 250.00,
  "currency": "USD",
  "lastUpdatedAt": "2026-01-05T..."
}
```

### Test Confirmation

```bash
# First, set payment to paid_pending_consent via webhook
# Then:

curl -X POST http://localhost:3000/api/payments/PAYMENT_SESSION_ID/confirm \
  -H "Authorization: Bearer your-secret-key-here"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment confirmed and invoice marked as paid"
}
```

### Test Cancellation

```bash
curl -X POST http://localhost:3000/api/payments/PAYMENT_SESSION_ID/cancel \
  -H "Authorization: Bearer your-secret-key-here"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment cancelled and moved to manual review"
}
```

## Security Testing

### Test Authentication

1. **Try API without auth:**
   ```bash
   curl http://localhost:3000/api/payments/test/status
   ```
   **Expected**: 401 Unauthorized

2. **Try with invalid token:**
   ```bash
   curl http://localhost:3000/api/payments/test/status \
     -H "Authorization: Bearer wrong-key"
   ```
   **Expected**: 401 Unauthorized

3. **Try with valid token:**
   ```bash
   curl http://localhost:3000/api/payments/test/status \
     -H "Authorization: Bearer your-secret-key-here"
   ```
   **Expected**: 404 Not Found (expected - session doesn't exist)

### Test Webhook Signature

In production, invalid signatures should be rejected. In development mode, signature verification is lenient for testing.

## Dashboard Testing

### View Dashboard

1. **Navigate to**: `http://localhost:3000/dashboard`

2. **Verify displays:**
   - Status counts (initiated, pending, paid_and_confirmed, etc.)
   - Recent payment sessions table
   - "Payments Requiring Manual Review" section

3. **Test filters:**
   - Create payments with different statuses
   - Verify they appear in correct sections

### View API Documentation

1. **Navigate to**: `http://localhost:3000/api`
2. **Verify**: All endpoints documented with examples

## Performance Testing

### Polling Performance

1. **Monitor console during polling:**
   - Should poll every 3 seconds
   - Maximum 60 attempts (3 minutes)
   - Should stop after status change or timeout

2. **Check network tab:**
   - Only status endpoint should be polled
   - No other unnecessary requests

### Multiple Buttons

1. **Test page with many invoices:**
   - Verify all buttons inject correctly
   - No performance degradation
   - No duplicate injections

## Checklist

Use this checklist to verify all tests:

- [ ] Extension loads without errors
- [ ] Buttons inject correctly
- [ ] Button click creates payment session
- [ ] Payment URL opens in new tab
- [ ] Polling starts correctly
- [ ] Webhook updates status
- [ ] Consent modal appears
- [ ] Confirm button marks invoice as paid
- [ ] Cancel button moves to manual review
- [ ] Failed payments handled gracefully
- [ ] API connection errors handled
- [ ] DOM changes don't break extension
- [ ] Dashboard displays correctly
- [ ] Authentication works
- [ ] Audit logs created correctly
- [ ] No console errors
- [ ] All "Kathy:" logs present

## Troubleshooting

### Console shows no logs
- Verify extension is loaded
- Check extension is enabled
- Reload the Practice Panther page

### Buttons don't appear
- Check DOM structure matches expected
- Look for "DOM structure changed" warnings
- Verify invoices have balance > $0

### Polling never completes
- Check backend is running
- Verify webhook was triggered
- Check payment_session status in database

### Modal doesn't appear
- Check status is "paid_pending_consent"
- Verify polling is running
- Check console for errors

## Success Criteria

All tests pass if:
1. ✅ Full flow completes without errors
2. ✅ All statuses transition correctly
3. ✅ Audit logs capture every action
4. ✅ No sensitive data stored
5. ✅ Graceful error handling everywhere
6. ✅ Console shows clear "Kathy:" logs
7. ✅ Dashboard reflects all changes
8. ✅ Authentication enforced

## Next Steps

After all tests pass:
1. Test with real RunPayments sandbox
2. Deploy backend to staging
3. Update extension with staging URL
4. Perform end-to-end integration test
5. Prepare for production deployment


