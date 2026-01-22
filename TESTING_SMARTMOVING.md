# SmartMoving Integration - Testing Guide

## ✅ Build Status
- **Kathy Cloud:** ✓ Built successfully
- **Kathy Extension:** ✓ Built successfully
- **Integration Points:** All verified

## Deployment Steps

### 1. Deploy Kathy Cloud to Vercel

```bash
cd /Users/jonscott/Desktop/kathyv3/kathy-cloud

# Commit the new code
git add .
git commit -m "Add SmartMoving integration"
git push origin main
```

Vercel will auto-deploy from your main branch. Check deployment at:
https://vercel.com/jrlscott-7139s-projects/kathy-cloud

### 2. Load Extension in Chrome

```bash
# Extension is already built in build/chrome-mv3-prod
# Just reload it in Chrome
```

1. Open Chrome → `chrome://extensions/`
2. Find "Kathy" extension
3. Click the reload icon 🔄
4. Extension now includes SmartMoving integration

## Testing Workflow

### Phase 1: Configure SmartMoving (via UI)

**Access the Admin UI:**
1. Go to: https://kathy-cloud.vercel.app/dashboard (or your deployment URL)
2. Log in with your Kathy account
3. Click **"SmartMoving"** button in the top right

**Configure Settings:**
1. Toggle **"Enable SmartMoving Integration"** → ON
2. Enter **API Key** (from SmartMoving → Settings → API)
3. Enter **Client ID** (from SmartMoving)
4. Set **Processing Fee %** (default: 2.75)
5. Set **Confirm Category** (default: deposit)
6. Click **"Save Configuration"**

Expected result: ✅ "SmartMoving configuration saved successfully!"

### Phase 2: Test Payment Link Generation

**In the SmartMoving Admin UI:**
1. Open a SmartMoving opportunity in another tab
2. Copy the **Opportunity ID** from URL:
   ```
   https://app.smartmoving.com/opportunities/COPY_THIS_ID/sales
   ```
3. Return to Kathy dashboard → SmartMoving page
4. Paste Opportunity ID in **"SmartMoving Opportunity ID"** field
5. Click **"Generate Test Payment Link"**

**Expected Results:**
```
✅ Payment Link Generated!

Fee Breakdown:
  Estimate Amount: $952.75
  Processing Fee (2.75%): $26.19
  Total: $977.94

Customer:
  Name: John Doe
  Email: john@example.com

Payment Link: https://checkout.runpayments.com/...
```

**Verify:**
- ✅ Click "Copy" → Link copied to clipboard
- ✅ Click "Open" → Opens RunPayments hosted page
- ✅ Customer data is pre-filled on payment page
- ✅ Amount includes estimate + processing fee

### Phase 3: Test Extension Button (Optional)

**In SmartMoving Web App:**
1. Navigate to an opportunity: `https://app.smartmoving.com/opportunities/{id}/sales`
2. Look for green **"Generate Kathy Payment Link"** button
3. Click button
4. Modal should appear with payment link + fee breakdown

**Note:** If button doesn't appear:
- Check Chrome DevTools console for errors
- Verify extension is loaded and enabled
- Refresh the SmartMoving page

### Phase 4: Test Payment Processing & Sync

**Process a Test Payment:**
1. Use the generated payment link
2. Complete a test payment in RunPayments
3. Wait 5-10 seconds for webhook processing

**Verify in Kathy Dashboard:**
1. Go to main dashboard: `/dashboard`
2. Find the payment in "Recent Payment Sessions"
3. Check status: Should be `paid_pending_consent`
4. Look for "SmartMoving" in Application column

**Verify in SmartMoving:**
1. Open the opportunity in SmartMoving
2. Navigate to the job details
3. Check **Accounting Notes** tab
4. Should see:
   ```
   PAYMENT RECEIVED via Kathy
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Estimate Amount: $952.75
   Processing Fee: $26.19 (2.75%)
   Total Paid: $977.94
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Quote #: 35219
   Invoice: SM-35219
   ...
   ```
5. Check job status: Should be **confirmed**
6. Check leadStatus: Should show **"Deposit Pending"**

### Phase 5: Check Audit Logs

**In SmartMoving Admin UI:**
1. Go to `/dashboard/smartmoving`
2. Scroll to **"SmartMoving Sync Audit Logs"** section
3. Click **"Refresh"**

**Expected Audit Logs:**
```
✅ payment_initiated_from_smartmoving
   Invoice: SM-35219
   Metadata: { opportunityId, quoteNumber, customerEmail, amounts }

✅ smartmoving_sync_started
   Metadata: { opportunityId, quoteNumber }

✅ smartmoving_sync_success
   Metadata: { opportunityId, jobIds, syncDuration }
```

## Verification Checklist

### Integration Points ✓

- [x] **Dashboard Integration:** "SmartMoving" button visible on main dashboard
- [x] **Settings Persistence:** Configuration saves to `Organization.settings` JSONB
- [x] **Payment Session Creation:** Uses existing `/api/payments` flow
- [x] **Webhook Handler:** Modified to include SmartMoving sync (non-blocking)
- [x] **Confirm Handler:** Modified to include SmartMoving sync (non-blocking)
- [x] **Auth Middleware:** Uses existing `withAuth` for all routes
- [x] **Database Schema:** No migrations needed (uses existing JSONB)

### New Features ✓

- [x] **SmartMoving API Client:** `/lib/smartmoving.ts`
- [x] **Sync Orchestration:** `/lib/smartmoving-sync.ts`
- [x] **Pre-fill Payment Endpoint:** `/api/payment-sessions/from-smartmoving`
- [x] **Settings Update Endpoint:** `/api/organizations/update-settings`
- [x] **Admin UI Page:** `/dashboard/smartmoving`
- [x] **Extension Content Script:** `/src/contents/smartmoving.tsx`

### End-to-End Flow ✓

```
User → Dashboard → Configure SmartMoving → Save
User → Test Payment Link → Generate → Success
User → Copy Link → Send to Customer → Customer Pays
Webhook → Process Payment → Sync to SmartMoving → Success
SmartMoving → Job Confirmed → Notes Updated → ✅ Done
```

## Troubleshooting

### Issue: "SmartMoving integration not enabled"

**Fix:**
1. Go to `/dashboard/smartmoving`
2. Toggle "Enable SmartMoving Integration" to ON
3. Save configuration

### Issue: "Failed to generate payment link"

**Possible Causes:**
1. Invalid API credentials → Verify in SmartMoving settings
2. Opportunity not found → Check opportunity ID is correct
3. Missing estimate amount → Ensure opportunity has an estimate

**Debug:**
1. Open browser DevTools → Network tab
2. Click "Generate Test Payment Link"
3. Check request/response for error details
4. Check Vercel logs for server-side errors

### Issue: Payment not syncing to SmartMoving

**Check Audit Logs:**
1. Go to `/dashboard/smartmoving`
2. Look for `smartmoving_sync_failed` entries
3. Check metadata for error details

**Common Issues:**
- Customer email doesn't match → Update customer email in SmartMoving
- API credentials expired → Refresh credentials
- Network timeout → Check Vercel logs

## Quick Test Script

```bash
# 1. Deploy
cd /Users/jonscott/Desktop/kathyv3/kathy-cloud
git add .
git commit -m "Add SmartMoving integration"
git push origin main

# 2. Reload Extension
# Open chrome://extensions/ and click reload on Kathy extension

# 3. Test via UI
# Go to: https://kathy-cloud.vercel.app/dashboard/smartmoving
# Enter SmartMoving credentials
# Generate test payment link
# Verify sync works
```

## SQL Verification (Optional)

If you want to verify the configuration was saved:

```sql
-- Check organization settings
SELECT
  id,
  name,
  slug,
  settings->'smartMoving' as smartmoving_config
FROM organizations
WHERE slug = 'your-org-slug';

-- Check recent payment sessions
SELECT
  id,
  invoice_id,
  application_name,
  status,
  created_at
FROM payment_sessions
WHERE application_name = 'SmartMoving'
ORDER BY created_at DESC
LIMIT 5;

-- Check SmartMoving audit logs
SELECT
  al.action,
  al.timestamp,
  al.metadata,
  ps.invoice_id
FROM audit_logs al
JOIN payment_sessions ps ON ps.id = al.payment_session_id
WHERE al.action LIKE 'smartmoving%'
ORDER BY al.timestamp DESC
LIMIT 10;
```

## Success Criteria

✅ **Configuration:**
- SmartMoving settings save successfully
- API credentials validated
- Toggle works correctly

✅ **Payment Link Generation:**
- Generates link from SmartMoving opportunity
- Pre-fills customer data
- Calculates fees correctly
- Link opens in RunPayments

✅ **Payment Processing:**
- Payment completes successfully
- Webhook processes without errors
- Status updates to `paid_pending_consent`

✅ **SmartMoving Sync:**
- Job accounting notes updated
- Job confirmed with category
- leadStatus changed to "Deposit Pending"
- Audit logs created successfully

✅ **Error Handling:**
- Payment succeeds even if sync fails
- Clear error messages in UI
- Audit logs capture all errors
- Non-blocking sync (doesn't delay webhook)

## Next Steps After Testing

Once everything works:

1. **Production Rollout:**
   - Update environment variables in Vercel
   - Add production SmartMoving credentials
   - Test with real customer (small amount first)

2. **Documentation:**
   - Train team on new workflow
   - Create customer-facing payment link templates
   - Document troubleshooting steps

3. **Monitoring:**
   - Watch audit logs for errors
   - Monitor sync success rate
   - Track time savings vs manual entry

4. **Future Enhancements:**
   - Auto-booking when SmartMoving API supports it
   - Bidirectional sync
   - Batch payment link generation
   - Email template integration

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Vercel deployment logs
3. Review audit logs in SmartMoving admin UI
4. Verify API credentials are valid
5. Test with curl to isolate frontend vs backend issues

**Example curl test:**
```bash
# Test SmartMoving config endpoint
curl -X POST https://your-kathy-cloud.vercel.app/api/organizations/update-settings \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "YOUR_ORG_ID",
    "settings": {
      "smartMoving": {
        "enabled": true,
        "apiKey": "YOUR_API_KEY",
        "clientId": "YOUR_CLIENT_ID",
        "ccProcessingFeePercent": 2.75,
        "confirmCategory": "deposit"
      }
    }
  }'
```
