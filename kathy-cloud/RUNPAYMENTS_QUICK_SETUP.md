# RunPayments Sandbox - Quick Setup Guide

## 🎯 You're Almost Ready!

The RunPayments integration is implemented. Just need to add your credentials!

---

## 📝 Step 1: Fill in Your Credentials

Open this file: **`kathy-cloud/.env`**

Find these lines and replace the placeholders:

```env
RUNPAYMENTS_API_KEY="PASTE_YOUR_API_KEY_HERE"
RUNPAYMENTS_MERCHANT_ID="PASTE_YOUR_MERCHANT_ID_HERE"  
RUNPAYMENTS_WEBHOOK_SECRET="PASTE_YOUR_WEBHOOK_SECRET_HERE"
```

### Where to Find Each Value:

**🔑 API_KEY (Access Token / Source Key)**
- Login to: https://sandbox.runpayments-ab.io/
- Navigate to: **Control Panel** → **Source Management** → **Create Key**
- Looks like: `sk_test_...` or a long alphanumeric string
- Copy the entire key

**🏪 MERCHANT_ID (cc_mid)**
- In your RunPayments Control Panel
- Go to: **Merchant Accounts** or **Settings**
- Look for: **Credit Card Merchant ID** or **cc_mid**
- This is usually a numeric ID

**🔐 WEBHOOK_SECRET**
- In RunPayments Control Panel
- Go to: **Webhooks** or **API Settings**
- Look for: **Webhook Signing Secret**
- If you can't find it, ask RunPayments support for it
- For testing, you can use any string (since SKIP_WEBHOOK_VERIFICATION="true")

---

## 🔄 Step 2: Restart the Backend

After filling in the credentials:

```bash
# Stop the current server (if running)
lsof -ti:3000 | xargs kill

# Start it again
cd kathy-cloud
npm run dev
```

---

## 🧪 Step 3: Test the Integration

1. **Go to Practice Panther** (or your invoice page)
2. **Click "Collect with Kathy"** on any invoice
3. **Check what happens:**
   - ✅ Should open a **real RunPayments hosted payment page**
   - ✅ URL should look like: `https://sandbox.runpayments-ab.io/hpp/...`
   - ✅ You'll see RunPayments' payment form

4. **Complete test payment:**
   - Use RunPayments test card numbers
   - Payment should process
   - Check the Kathy dashboard at `http://localhost:3000/dashboard`

---

## 🔍 Verify It's Working

**Check the server console logs for:**

```
Kathy Cloud: Creating RunPayments HPP (Hosted Payment Page)
Kathy Cloud: RunPayments HPP created successfully
```

**If you see errors:**
- Check that credentials are correct (no extra spaces)
- Verify API_KEY has proper permissions
- Make sure MERCHANT_ID is valid

---

## 📋 Example Configuration

Your `.env` should look something like this (with your real values):

```env
RUNPAYMENTS_MODE="runpayments"
RUNPAYMENTS_API_URL="https://sandbox.runpayments-ab.io"
RUNPAYMENTS_API_KEY="sk_test_abc123xyz789..."
RUNPAYMENTS_MERCHANT_ID="12345"
RUNPAYMENTS_WEBHOOK_SECRET="whsec_abc123..."
```

---

## 🎉 What Happens Next

When a user pays:

1. **Payment completed on RunPayments HPP**
2. **RunPayments sends webhook** to your server
3. **Kathy Cloud receives webhook** → marks session as `paid_pending_consent`
4. **Extension polls** and sees the status change
5. **Consent modal appears** → "Mark invoice #I-123 as paid for $X?"
6. **User confirms** → Invoice marked as PAID in Practice Panther ✅

---

## 🐛 Troubleshooting

### "API error" when clicking button
- Check server console for detailed error
- Verify all 3 credentials are filled in
- Make sure there are no typos

### Payment page doesn't open
- Check that `RUNPAYMENTS_MODE="runpayments"` (not "mock")
- Verify API_URL is correct: `https://sandbox.runpayments-ab.io`
- Check console logs for error messages

### Can't find credentials
- Contact RunPayments support
- They can provide: API keys, Merchant IDs, and webhook secrets
- Mention you're using their API v1 HPP endpoint

---

## 📞 Need Help?

1. Check server console logs (look for "Kathy Cloud:")
2. Check browser console (look for "Kathy:")
3. Verify credentials are correct
4. Contact RunPayments support if credential issues

---

**Once configured, the system will use real RunPayments hosted payment pages!** 🚀





