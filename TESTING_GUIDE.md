# Kathy Cloud - End-to-End Testing Guide

## 🧪 Complete Payment Flow Validation

This guide helps you verify all the improvements made today are working correctly.

---

## 📋 Pre-Test Checklist

- [ ] Extension rebuilt: `npm run build` ✅ (Already done)
- [ ] Extension loaded in Chrome (Load unpacked: `build/chrome-mv3-prod`)
- [ ] Backend deployed to Vercel: https://www.kathy.dev
- [ ] RunPayments webhook configured and signature verification enabled
- [ ] Test user account: jon@agently.bot

---

## 🔐 Test 1: Authentication & Token Refresh

### Steps:
1. **Open Extension Popup**
   - Click Kathy extension icon
   - Should show: "Welcome, Jon! 👋" and "Organization: J&J Ventures"

2. **Verify Token Auto-Refresh**
   - Open browser console in Practice Panther
   - Check for: `Kathy: Auth token expired, attempting refresh...`
   - Should auto-refresh without errors (happens after ~55 minutes)

3. **Test Dashboard Login**
   - Go to: https://www.kathy.dev/dashboard
   - Should stay logged in on refresh (no 401 errors)

**Expected Results:**
- ✅ Extension shows user first name (capitalized) and organization
- ✅ Tokens refresh automatically in background
- ✅ Dashboard persists session on page refresh

---

## 💳 Test 2: Complete Payment Flow

### Steps:

**A. Initiate Payment**
1. Go to Practice Panther invoices: `https://app.practicepanther.com/Invoice/`
2. Verify "K" badges appear on all invoices
3. Click "K" badge on an unpaid invoice
4. Side panel opens → Click "Collect Payment"
5. Payment dialog appears → Enter amount → Click "Initiate Payment"

**B. Complete Payment**
6. RunPayments hosted page opens in new tab
7. Complete test payment (use test card if available)
8. Return to Practice Panther tab

**C. Verify Instant Update**
9. **Without refreshing**, check the invoice row:
   - Badge should instantly change to: "✓ Paid" (green)
   - Row should have green tint

**D. Check Payment History**
10. Click the invoice row again to open side panel
11. Go to "Payments" tab
12. Should show:
    - Payment amount (formatted: $1,234.56)
    - Status: paid_and_confirmed
    - Created date
    - Processor transaction ID
13. "Collect Payment" button should be hidden
14. Should show: "✓ Payment Confirmed"

**E. Verify Dashboard**
15. Open: https://www.kathy.dev/dashboard
16. Find the payment session in the table
17. Verify:
    - Amount shows as currency: $1,234.56 (not 1234.56)
    - Organization: J&J Ventures (not "Unknown Org")
    - Application: Practice Panther (not "Unknown App")
    - Status: paid_and_confirmed

**Expected Results:**
- ✅ Payment initiated without 401 errors
- ✅ Badge updates instantly (no page refresh needed)
- ✅ Duplicate payment prevented (clicking paid invoice shows no "Collect Payment")
- ✅ Payment history displays correctly in panel
- ✅ Dashboard shows all data with proper formatting

---

## 🚫 Test 3: Duplicate Payment Prevention

### Steps:
1. Find an already paid invoice (shows "✓ Paid" badge)
2. Click the "✓ Paid" badge
3. Side panel opens
4. Verify: "Collect Payment" button is **NOT** shown
5. Should see: "✓ Payment Confirmed"

**Expected Results:**
- ✅ Cannot initiate duplicate payment for paid invoices
- ✅ Panel shows payment confirmation instead of collect button

---

## 🔄 Test 4: Session Persistence

### Steps:
1. Open dashboard: https://www.kathy.dev/dashboard
2. Verify you're logged in and see payment data
3. Refresh the page (F5 or Cmd+R)
4. Check browser console for errors

**Expected Results:**
- ✅ No 401 errors in console
- ✅ Dashboard stays logged in after refresh
- ✅ Payment sessions load successfully

---

## 🔐 Test 5: Webhook Security

### Steps:
1. Go to RunPayments dashboard
2. Check webhook delivery logs
3. Look for recent webhook deliveries
4. Verify: Status 200 (success)

**Note:** Webhook signature verification is now **ENABLED**. Invalid signatures will return 401.

**Expected Results:**
- ✅ Webhooks process successfully
- ✅ Payment status updates from pending → paid_and_confirmed
- ✅ Invalid signatures rejected (if tested)

---

## 📊 Test 6: Currency Formatting

### Dashboard Table:
- Amounts show with: `$1,234.56` format
- Commas for thousands: `$12,345.67`
- Two decimal places always: `$100.00` (not `$100`)

### Extension Panel:
- Payment history amounts: `$1,234.56`
- Invoice amounts in dialog: `$1,234.56`

**Expected Results:**
- ✅ All amounts formatted as proper USD currency
- ✅ No raw numbers like "1234.56" anywhere

---

## 🐛 Known Issues to Watch For

1. **401 Errors**: Should not occur with token refresh implemented
2. **Dashboard Logout**: Should stay logged in on refresh
3. **Badge Not Updating**: Should update instantly after payment
4. **CORS Errors**: Should not occur (all endpoints have CORS headers)
5. **Duplicate Payments**: Should be prevented for paid invoices

---

## 📝 How to Report Issues

If you encounter any problems:

1. **Open Browser Console** (F12 → Console tab)
2. **Look for errors** (red text)
3. **Copy error message** and relevant logs
4. **Note what you were doing** when error occurred
5. **Share context**: Which page? Which action?

---

## ✅ Success Criteria

All tests pass if:
- ✅ Authentication works and persists
- ✅ Tokens refresh automatically
- ✅ Payments complete without errors
- ✅ UI updates instantly (no refresh needed)
- ✅ Duplicate payments prevented
- ✅ Dashboard shows all data correctly
- ✅ Currency formatted properly everywhere
- ✅ Webhooks process successfully

---

## 🚀 Next Steps After Testing

Once all tests pass:
1. Consider enabling in production for all users
2. Monitor Vercel logs for any unexpected errors
3. Check RunPayments webhook delivery success rate
4. Gather user feedback on the payment flow

---

## 🆘 Quick Troubleshooting

**Extension not showing user name?**
- Check console logs for API errors
- Verify `/api/auth/me` endpoint returns user data
- Reload extension (chrome://extensions → Reload)

**Dashboard logging out?**
- Check if cookies are enabled
- Verify Supabase session is stored
- Check Network tab for 401 errors on API calls

**Payment not updating?**
- Check webhook delivery in RunPayments dashboard
- Verify webhook signature is valid
- Check Vercel function logs for webhook processing

**Currency not formatting?**
- Check if amount is a number (not string)
- Verify `.toLocaleString()` is used
- Check browser console for JavaScript errors
