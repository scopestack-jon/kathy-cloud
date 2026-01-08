# Multi-Application End-to-End Testing Guide

Comprehensive testing checklist for Kathy's multi-application deployment.

## Pre-Testing Setup

### Environment Preparation

1. **Supabase Database**
   - [ ] Database schema deployed
   - [ ] RLS policies active
   - [ ] Test organization created
   - [ ] Test admin user created

2. **Vercel Deployment**
   - [ ] Backend deployed successfully
   - [ ] All environment variables configured
   - [ ] CORS configured for extensions
   - [ ] Webhooks endpoint accessible

3. **Extension Build**
   - [ ] Production build created
   - [ ] Loaded in Chrome (unpacked for testing)
   - [ ] API_URL points to Vercel deployment
   - [ ] Supabase credentials configured

4. **Test Accounts**
   - [ ] Google account for OAuth testing
   - [ ] Test organization in Supabase
   - [ ] RunPayments sandbox account active

## Test Suite 1: Authentication Flow

### Test 1.1: Google OAuth Sign-Up

**Steps:**
1. Open extension popup (not authenticated)
2. Click "Sign Up with Google"
3. Complete Google OAuth flow
4. Verify redirect back to extension

**Expected Results:**
- [ ] OAuth consent screen appears
- [ ] User successfully authenticated
- [ ] Auth token stored in chrome.storage.local
- [ ] User record created in Supabase users table
- [ ] Welcome message displayed

**Test Data:**
```
Email: test-user@example.com
Organization: Test Legal Firm
Slug: test-legal-firm
```

### Test 1.2: Organization Creation

**Steps:**
1. After OAuth, fill organization creation form
2. Enter organization name and slug
3. Submit form

**Expected Results:**
- [ ] Organization created in database
- [ ] User assigned as admin
- [ ] Default Practice Panther config created (disabled)
- [ ] Redirected to dashboard or extension success page

### Test 1.3: Session Persistence

**Steps:**
1. Close and reopen extension
2. Close and reopen browser
3. Check auth state

**Expected Results:**
- [ ] User remains authenticated after extension close
- [ ] User remains authenticated after browser restart
- [ ] Token auto-refreshes when expired

## Test Suite 2: Application Configuration

### Test 2.1: Configure Practice Panther

**Steps:**
1. Navigate to https://app.practicepanther.com (or demo page)
2. Open extension
3. Click "Configure Application"
4. Click column containing invoice ID
5. Click column containing amount
6. Click column containing status
7. Enter application name: "Practice Panther"
8. Submit configuration

**Expected Results:**
- [ ] Visual configurator activates
- [ ] Columns highlight on hover
- [ ] Configuration saved to backend
- [ ] Success message displayed
- [ ] Application appears in dashboard

**Verify in Database:**
```sql
SELECT * FROM application_configs 
WHERE organization_id = '[your-org-id]'
AND application_name = 'Practice Panther';
```

### Test 2.2: Configure Custom Application

**Steps:**
1. Navigate to any webpage with an invoice table
2. Repeat configuration process
3. Name it "Custom Billing System"

**Expected Results:**
- [ ] Configurator works on any page
- [ ] Configuration saved successfully
- [ ] Application listed in dashboard

### Test 2.3: Multiple Application Support

**Steps:**
1. Configure 3 different applications
2. Visit dashboard → Applications page
3. Verify all 3 appear

**Expected Results:**
- [ ] All applications listed
- [ ] Each shows correct configuration
- [ ] Can enable/disable individually
- [ ] Can delete applications

## Test Suite 3: Universal Content Script

### Test 3.1: Auto-Detection

**Steps:**
1. Navigate to configured Practice Panther page
2. Wait for page load
3. Observe invoice table

**Expected Results:**
- [ ] "K" badges appear next to invoices
- [ ] Badges only appear on invoices with valid ID and amount
- [ ] No duplicate badges
- [ ] Badges styled correctly (green, white text)

### Test 3.2: Unconfigured Application

**Steps:**
1. Navigate to unconfigured application with invoices
2. Observe behavior

**Expected Results:**
- [ ] No badges appear
- [ ] Banner prompts to configure (if authenticated)
- [ ] No errors in console
- [ ] Page functionality unaffected

### Test 3.3: Dynamic Content Loading

**Steps:**
1. On configured page, trigger dynamic content load
2. Observe if badges appear on new invoices

**Expected Results:**
- [ ] Mutation observer detects new content
- [ ] Badges injected on new invoices
- [ ] No performance degradation

## Test Suite 4: Payment Flow

### Test 4.1: Trial Mode (Unauthenticated)

**Steps:**
1. Sign out of extension
2. Configure an application (saves to localStorage)
3. Click "K" badge on invoice
4. Create payment (1st time)
5. Repeat for 2nd and 3rd payment
6. Attempt 4th payment

**Expected Results:**
- [ ] First 3 payments succeed
- [ ] Trial counter increments
- [ ] 4th payment shows sign-up prompt
- [ ] Trial banner displays remaining payments

**Verify:**
```javascript
chrome.storage.local.get('trialUsage', (result) => {
  console.log(result.trialUsage) // Should be 3
})
```

### Test 4.2: Authenticated Payment Creation

**Steps:**
1. Sign in to extension
2. Click "K" badge on invoice ($125.00)
3. Verify panel opens with enriched data
4. Click "Collect Payment"
5. Verify payment session created

**Expected Results:**
- [ ] Panel shows invoice details
- [ ] Amount displays correctly: $125.00
- [ ] Application name shows: "Practice Panther"
- [ ] Payment session created in database
- [ ] Payment URL returned
- [ ] Opens RunPayments hosted page

**Verify in Database:**
```sql
SELECT * FROM payment_sessions 
WHERE organization_id = '[your-org-id]'
AND invoice_id = 'I-123'
AND application_name = 'Practice Panther'
ORDER BY created_at DESC LIMIT 1;
```

### Test 4.3: Multi-Tenant Isolation

**Steps:**
1. Create 2 test organizations
2. Configure same application for both
3. Create payments from each
4. Verify data isolation

**Expected Results:**
- [ ] Org A cannot see Org B's payments
- [ ] Compound invoice IDs prevent collisions
- [ ] RLS policies enforce separation
- [ ] Dashboard only shows own org's data

**Test Query (should return 0 rows):**
```sql
-- As Org A user, try to access Org B's payment
SELECT * FROM payment_sessions 
WHERE organization_id = '[org-b-id]';
-- RLS should block this
```

### Test 4.4: Webhook Processing

**Steps:**
1. Create payment session
2. Simulate payment via RunPayments sandbox
3. Verify webhook received
4. Check payment status updated

**Expected Results:**
- [ ] Webhook hits `/api/webhooks/payment`
- [ ] Payment session found by compound invoice ID
- [ ] Status updated to `paid_and_confirmed`
- [ ] Audit log created
- [ ] Extension badge updates to "✓ Paid"

**Monitor Webhook:**
```bash
# In Vercel dashboard or via CLI
vercel logs --follow
```

## Test Suite 5: Dashboard Features

### Test 5.1: Application Management

**Steps:**
1. Login to dashboard at [vercel-url]/dashboard/applications
2. View configured applications
3. Disable one application
4. Re-enable it
5. Delete an application

**Expected Results:**
- [ ] All configured apps listed
- [ ] Enable/disable toggles work immediately
- [ ] Deletion requires confirmation
- [ ] Changes reflected in extension immediately

### Test 5.2: Payment Filtering

**Steps:**
1. Create payments from 2 different applications
2. Go to dashboard
3. Use application filter dropdown
4. Filter by each application

**Expected Results:**
- [ ] Filter shows all applications
- [ ] Selecting app filters payment list
- [ ] Count updates correctly
- [ ] "All Applications" shows everything

### Test 5.3: Multi-Application Analytics

**Steps:**
1. Review payment sessions table
2. Verify "Application" column shows correctly
3. Check status breakdown

**Expected Results:**
- [ ] Application column populated
- [ ] Can sort by application
- [ ] Status badges display correctly
- [ ] Timestamps are accurate

## Test Suite 6: Error Handling

### Test 6.1: Network Failures

**Steps:**
1. Disconnect from internet
2. Try to create payment
3. Reconnect
4. Retry

**Expected Results:**
- [ ] Graceful error message displayed
- [ ] No data loss
- [ ] Retry succeeds after reconnection
- [ ] User notified of failure

### Test 6.2: Invalid Configuration

**Steps:**
1. Configure application with wrong columns
2. Try to extract invoice data
3. Observe behavior

**Expected Results:**
- [ ] No crashes
- [ ] Clear error message
- [ ] Prompt to reconfigure
- [ ] Option to delete bad configuration

### Test 6.3: Authentication Expiration

**Steps:**
1. Manually expire auth token
2. Try to create payment
3. Observe refresh behavior

**Expected Results:**
- [ ] Token auto-refreshes
- [ ] If refresh fails, user prompted to re-authenticate
- [ ] No data loss during refresh
- [ ] Seamless user experience

## Test Suite 7: Performance

### Test 7.1: Large Invoice Tables

**Steps:**
1. Test on page with 100+ invoice rows
2. Measure injection time
3. Check for lag or freezing

**Expected Results:**
- [ ] Badges inject within 2 seconds
- [ ] Page remains responsive
- [ ] No visible performance degradation
- [ ] Memory usage acceptable

### Test 7.2: Multiple Tabs

**Steps:**
1. Open 5 tabs with configured applications
2. Verify extension works in all
3. Check background script performance

**Expected Results:**
- [ ] All tabs function independently
- [ ] No cross-tab interference
- [ ] Background script CPU < 5%
- [ ] Memory usage scales linearly

## Test Suite 8: Security

### Test 8.1: RLS Policy Enforcement

**Steps:**
1. Get auth token for Org A
2. Try to query Org B's data via API
3. Verify access denied

**Test:**
```bash
curl https://[your-vercel-url]/api/applications \
  -H "Authorization: Bearer [org-a-token]"
# Should only return Org A's applications
```

### Test 8.2: XSS Prevention

**Steps:**
1. Configure application with malicious input
2. Try to inject scripts via configuration
3. Verify sanitization

**Test Data:**
```
Application Name: <script>alert('XSS')</script>
```

**Expected Results:**
- [ ] Script tags escaped/sanitized
- [ ] No script execution
- [ ] Data stored safely

### Test 8.3: Token Security

**Steps:**
1. Inspect chrome.storage.local
2. Verify tokens are encrypted/hashed
3. Check no sensitive data in plain text

**Expected Results:**
- [ ] Auth tokens not readable
- [ ] API keys not exposed
- [ ] User data properly secured

## Test Suite 9: Cross-Browser (Chrome Focus)

### Test 9.1: Chrome Stable

**Test on:**
- Chrome 120+ (latest stable)

**Expected Results:**
- [ ] Full functionality works
- [ ] No console errors
- [ ] Performance meets targets

### Test 9.2: Chrome Extensions API

**Verify:**
- [ ] chrome.storage API works correctly
- [ ] chrome.runtime.sendMessage works
- [ ] chrome.tabs API functions properly
- [ ] Content scripts inject successfully

## Test Suite 10: Regression Testing

### Test 10.1: Existing Features

After multi-app changes, verify:

- [ ] Practice Panther still works as before
- [ ] Payment creation unchanged (except app tracking)
- [ ] Dashboard displays correctly
- [ ] Webhooks process successfully
- [ ] Authentication still functional

### Test 10.2: Backward Compatibility

**Steps:**
1. Load existing payment sessions (pre-multi-app)
2. Verify they display correctly
3. Check no data corruption

**Expected Results:**
- [ ] Old payments display (applicationName may be null)
- [ ] No errors processing old data
- [ ] Migration path works

## Bug Reporting Template

When bugs are found:

```markdown
### Bug Report

**Environment:**
- Browser: Chrome 120.0.6099.129
- Extension Version: 2.0.0
- Backend: Vercel (production)
- Date/Time: 2026-01-08 14:30 PST

**Steps to Reproduce:**
1. Navigate to...
2. Click...
3. Observe...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[Attach if applicable]

**Console Errors:**
```
[Paste any errors]
```

**Database State:**
```sql
[Relevant query results]
```

**Severity:** Critical / High / Medium / Low

**Impact:** [Number of users affected]
```

## Success Criteria

All tests must pass before production release:

- [ ] 100% of authentication flows work
- [ ] 100% of configuration scenarios succeed
- [ ] 100% of payment creations complete
- [ ] 0 critical bugs
- [ ] < 5 minor bugs
- [ ] All performance targets met
- [ ] Security audit passed

## Post-Testing

After all tests pass:

1. Document any workarounds needed
2. Create known issues list
3. Prepare release notes
4. Schedule production deployment
5. Plan monitoring strategy

---

**Testing Complete?** Review this checklist and ensure all boxes are checked before deploying to production!

