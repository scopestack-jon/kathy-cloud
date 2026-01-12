# RunPayments / Payment Processor Setup Guide

## 🎯 Overview

Kathy Cloud supports multiple payment processor modes:
- **Mock Mode** - For testing without real API (current default)
- **Stripe Mode** - Direct Stripe integration or Stripe via RunPayments
- **RunPayments Mode** - Native RunPayments API

## 🚀 Quick Setup

### Option 1: Stripe Integration (Recommended for Getting Started)

**Step 1: Get Stripe API Keys**
1. Go to https://dashboard.stripe.com
2. Create account / Sign in
3. Click **Developers** → **API keys**
4. Copy your **Secret key** (starts with `sk_test_...`)
5. Copy your **Webhook signing secret** (from Webhooks section)

**Step 2: Configure `.env` file**
```env
RUNPAYMENTS_MODE="stripe"
STRIPE_SECRET_KEY="sk_test_your_actual_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
SKIP_WEBHOOK_VERIFICATION="false"
```

**Step 3: Set up Stripe Webhook**
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. Endpoint URL: `http://localhost:3000/api/webhooks/payment` (or your domain)
4. Events to send:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the **Signing secret** to `.env`

**Step 4: Restart Server**
```bash
# Stop current server
lsof -ti:3000 | xargs kill

# Restart
npm run dev
```

**Step 5: Test**
- Click "Collect with Kathy" in your extension
- Should redirect to real Stripe checkout
- Use test card: `4242 4242 4242 4242`, any future date, any CVC

---

### Option 2: RunPayments Native API

**Step 1: Get RunPayments Credentials**
- Contact RunPayments or check your dashboard
- Get: API Key, API URL, Webhook Secret

**Step 2: Configure `.env`**
```env
RUNPAYMENTS_MODE="runpayments"
RUNPAYMENTS_API_URL="https://api.runpayments.com/v1"
RUNPAYMENTS_API_KEY="your_runpayments_api_key"
RUNPAYMENTS_WEBHOOK_SECRET="your_webhook_secret"
SKIP_WEBHOOK_VERIFICATION="false"
```

**Step 3: Configure Webhook in RunPayments**
- Webhook URL: `https://your-domain.com/api/webhooks/payment`
- Events: payment success, payment failed

**Step 4: Restart Server & Test**

---

### Option 3: Mock Mode (Testing Only)

**For testing without real payment processing:**

```env
RUNPAYMENTS_MODE="mock"
SKIP_WEBHOOK_VERIFICATION="true"
```

Mock mode generates fake payment URLs and allows manual webhook simulation.

---

## 🧪 Testing Your Setup

### Test Payment Creation

1. **Click "Collect with Kathy"** on an invoice
2. **Check what happens:**
   - **Mock**: Opens mock URL like `https://mock-checkout.example.com/pay/...`
   - **Stripe**: Opens real Stripe checkout (looks like `https://checkout.stripe.com/c/pay/...`)
   - **RunPayments**: Opens RunPayments checkout page

### Test Webhook (Mock/Development)

Manually trigger a webhook to test the flow:

```bash
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "x-runpayments-signature: test" \
  -d '{
    "id": "evt_test_123",
    "type": "payment_succeeded",
    "data": {
      "payment_id": "PROCESSOR_PAYMENT_ID_HERE",
      "amount": 150.00,
      "currency": "USD",
      "metadata": {
        "paymentSessionId": "YOUR_SESSION_ID"
      }
    }
  }'
```

Replace `PROCESSOR_PAYMENT_ID_HERE` with the ID from your database.

---

## 🔧 Environment Variables Reference

```env
# Payment Processor Mode
RUNPAYMENTS_MODE="mock|stripe|runpayments"

# Stripe Configuration (when RUNPAYMENTS_MODE=stripe)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# RunPayments Configuration (when RUNPAYMENTS_MODE=runpayments)
RUNPAYMENTS_API_URL="https://api.runpayments.com"
RUNPAYMENTS_API_KEY="your-api-key"
RUNPAYMENTS_WEBHOOK_SECRET="your-webhook-secret"

# Development Options
SKIP_WEBHOOK_VERIFICATION="true|false"  # Only use 'true' in development!
```

---

## 🔒 Security Notes

### Production Checklist:
- [ ] Use HTTPS for all API URLs
- [ ] Set `SKIP_WEBHOOK_VERIFICATION="false"`
- [ ] Use production API keys (not test keys)
- [ ] Verify webhook signatures properly
- [ ] Keep API keys in environment variables (never commit to git)

### Webhook Signature Verification:
- **Stripe**: Uses `Stripe-Signature` header with timestamp
- **RunPayments**: Uses HMAC SHA256 signature
- **Mock**: Skipped in development mode

---

## 🐛 Troubleshooting

### Payment URL not opening
- Check console logs for `Kathy Cloud: Creating payment session`
- Verify API keys are correct
- Check mode is set correctly in `.env`

### Webhook not working
- **Local development**: Use ngrok or similar to expose localhost
  ```bash
  ngrok http 3000
  # Then use ngrok URL in webhook config
  ```
- **Check signature**: Review webhook logs in dashboard
- **Verify secret**: Make sure `.env` has correct webhook secret

### "API Error" messages
- Check Kathy Cloud logs (server console)
- Look for detailed error messages
- Verify API URL and credentials

---

## 📝 Next Steps

1. **Choose your payment processor** (Stripe recommended for quick start)
2. **Configure `.env` with real credentials**
3. **Restart backend server**
4. **Test payment flow end-to-end**
5. **Set up webhooks for production**

---

## 💡 Pro Tips

- **Start with Stripe** - easiest to set up and test
- **Use test mode** - Stripe provides test cards
- **Monitor webhooks** - Check dashboard for delivery status
- **Check logs** - Server console shows detailed payment flow
- **Test cancellation** - Make sure Cancel button works too

---

**Need help?** Check server logs for `Kathy Cloud:` messages!





