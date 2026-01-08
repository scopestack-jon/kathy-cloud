# Kathy Extension - Quick Start Guide

## Install & Test (5 minutes)

### Step 1: Build the Extension
```bash
cd /Users/jonscott/Desktop/kathyv3
npm run build
```
**Expected output:** `🟢 DONE | Finished in ~700ms!`

### Step 2: Load in Chrome
1. Open Chrome
2. Go to: `chrome://extensions/`
3. Toggle "Developer mode" ON (top right)
4. Click "Load unpacked"
5. Select: `/Users/jonscott/Desktop/kathyv3/build/chrome-mv3-prod`

### Step 3: Verify Installation
- You should see "Kathy" extension card with green icon
- Status should be "ON"
- Check that permissions include:
  - Read and change data on app.practicepanther.com
  - Access to localhost

### Step 4: Test on Practice Panther
1. Navigate to: `https://app.practicepanther.com/invoices`
2. Open DevTools Console (Cmd+Option+J / F12)
3. Look for: `Kathy: Extension loaded`
4. Look for green "Pay" buttons next to invoice statuses

### Step 5: Test Payment Flow
1. Click any "Pay" button
2. You should see alert: `Payment for Invoice #I-X ($YYY.YY)`
3. Click OK on alert
4. Consent modal appears: `Mark invoice #I-X as paid for $YYY.YY?`
5. Click "Confirm" or "Cancel"

### Step 6: Check Console Logs
Expected console output:
```
Kathy: Extension loaded
Kathy: MutationObserver setup complete
Kathy: URL change detection setup complete
Kathy: Scanning 10 rows
Kathy: Injected button for invoice I-2
Kathy: Payment initiated {invoiceId: "I-2", amount: 12500}
Kathy: Cloud log sent {...}
```

## Development Mode (Hot Reload)

```bash
npm run dev
```
Then load `build/chrome-mv3-dev` instead of `build/chrome-mv3-prod`.

Changes to source files will auto-reload the extension.

## Troubleshooting

### No buttons appear
- Check console for `Kathy:` logs
- Verify you're on the invoices page
- Check that invoices have balance > $0
- Look for "DOM structure changed" warnings

### Cloud logging fails
- Start a test server at `http://localhost:3000/kathy-log`
- Or expect the log to fail silently (normal behavior without server)
- Check console for "Failed to send cloud log" messages

### Extension won't load
- Verify Chrome version is 120+
- Check for errors in `chrome://extensions/` 
- Try rebuilding: `npm run build`
- Clear build directory and rebuild

## Configuration

### Change Cloud Log Endpoint
Edit `src/background.ts`, line 23:
```typescript
const CLOUD_LOG_ENDPOINT = "http://localhost:3000/kathy-log"
```

Change to your endpoint, then rebuild.

## Files to Edit

- **Content script logic:** `src/contents/practice-panther.tsx`
- **Background worker:** `src/background.ts`
- **Manifest:** `public/manifest.json`
- **Styling:** Inline styles in `practice-panther.tsx`

## Next Steps

1. Test on actual Practice Panther account
2. Set up cloud logging endpoint
3. Integrate with RunPayments hosted pages
4. Deploy to Chrome Web Store (optional)

## Support

For issues, check:
1. Console logs (look for `Kathy:` prefix)
2. `README.md` for detailed documentation
3. `IMPLEMENTATION_SUMMARY.md` for technical details


