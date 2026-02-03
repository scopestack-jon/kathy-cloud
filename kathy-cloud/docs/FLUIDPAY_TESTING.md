# FluidPay Testing Notes

**Status**: Blocked - waiting on processor configuration

**Last Updated**: 2026-02-03

---

## What Works

- API key is valid: `api_39AHqO3Aoo8923NdhmsW4g21zgZ`
- Authentication passes
- Test script ready: `npm run test:fluidpay`
- FluidPay client implementation: `lib/fluidpay.ts`

## What's Needed

1. Log into https://sandbox.fluidpay.com
2. Go to Settings → Processors
3. Add a test/sandbox processor
4. Set it as the **default**

## Current Error

```
"no default processor set"
```

Both direct transactions and invoice creation fail with this error until a processor is configured.

## Account Info

| Field | Value |
|-------|-------|
| Environment | Sandbox |
| Merchant ID | `d60jj9n0i471t2bnauog` |
| User | `jon_sandbox` |
| Email | `Jon@kathy.dev` |
| Processors | 0 (none configured) |

## Test Cards (for when ready)

| Card Number | Type |
|-------------|------|
| `4111111111111111` | Visa Debit (standard test) |
| `4005519200000004` | Visa Credit, surchargeable |
| `4000000000000002` | Generic decline |
| `4000000000009995` | Insufficient funds |

- Use any future expiration date (e.g., `12/28`)
- Use any CVV (e.g., `123`)

## Running Tests

```bash
cd /Users/jonscott/Desktop/kathyv3/kathy-cloud
npm run test:fluidpay
```

Or with inline env:
```bash
FLUIDPAY_API_KEY=api_39AHqO3Aoo8923NdhmsW4g21zgZ npm run test:fluidpay
```

## Documentation

- Sandbox Dashboard: https://sandbox.fluidpay.com
- Test Data Docs: https://sandbox.fluidpay.com/docs/test_data/
- API Quickstart: https://sandbox.fluidpay.com/docs/api/quickstart

## Environment Variables

Add to `.env`:
```
FLUIDPAY_API_KEY=api_39AHqO3Aoo8923NdhmsW4g21zgZ
FLUIDPAY_ENVIRONMENT=sandbox
FLUIDPAY_WEBHOOK_SECRET=your-webhook-signature-secret
```
