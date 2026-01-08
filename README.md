# Kathy - Contextual Payment & Workflow Assistant

A modern Chrome Extension that brings Apollo-style contextual panels and inline actions to Practice Panther (and soon, other platforms). This extension provides:
- **Contextual side panels** with enriched data
- **Inline action buttons** for seamless workflows
- **Real payment processing** via RunPayments
- **Consent-driven architecture** with audit logging

This extension is **not a scraper** - it's a user-interaction-driven tool that requires explicit confirmation for every action.

## ✨ New Features

### Contextual Side Panel
Click the **Kathy badge** (green "K" button) next to any invoice to open a slide-in panel with:
- **Overview**: Invoice summary, payment status, quick stats
- **Payments**: Complete payment history with status tracking
- **Notes**: Coming soon - internal notes and comments
- **Workflows**: Coming soon - automation triggers

### Inline Actions
- **"Collect with Kathy"** button for instant payment initiation
- **Kathy badge** for quick access to entity details
- **Quick actions** directly from the side panel
- **Real-time status updates** during payment flow

### Integrated Payment Flow
1. Click "Collect with Kathy" → Opens RunPayments hosted page
2. Customer completes payment → Webhook notifies Kathy Cloud
3. Side panel automatically opens → Shows payment details
4. Consent modal appears → User confirms or cancels
5. Invoice updated in UI → Audit log created

**Key Principles:**
- No web scraping of Practice Panther servers
- No background automation without user presence
- No storage of sensitive data (card numbers, credentials)
- Every action requires explicit user interaction and consent
- Apollo-style UX that keeps you in your workflow

## Installation

### Prerequisites
- Node.js 18+ and npm
- Chrome 120+ with Developer Mode enabled
- PostgreSQL (via Prisma dev or your own instance)

### Setup Steps

#### 1. Extension Setup

```bash
# Install extension dependencies
npm install

# Build the extension
npm run build
```

#### 2. Kathy Cloud Backend Setup

```bash
# Navigate to backend
cd kathy-cloud

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start dev database
npx prisma dev --name kathy

# Update .env with database URL and API keys
# (See kathy-cloud/.env.example)

# Start the backend
npm run dev
```

The backend will run at `http://localhost:3000`.

#### 3. Load Extension in Chrome

- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" (toggle in top right)
- Click "Load unpacked"
- Select the `build/chrome-mv3-prod` directory from this project

### Development Mode

For development with hot reload:
```bash
# Terminal 1: Extension dev server
npm run dev

# Terminal 2: Kathy Cloud backend
cd kathy-cloud && npm run dev
```
Then load the `build/chrome-mv3-dev` directory in Chrome.

## Configuration

### Cloud Logging Endpoint

The extension logs "mark paid" actions to a localhost endpoint. The default URL is:
```
http://localhost:3000/kathy-log
```

To change this, edit `src/background.ts` and modify the `CLOUD_LOG_ENDPOINT` constant.

### Permissions

The extension requires minimal permissions:
- `activeTab`: To interact with the current Practice Panther tab
- `scripting`: To inject content scripts
- `http://localhost/*`: To send logs to the local cloud endpoint

**No storage or cookie permissions** - the extension does not persist any data.

## Usage

### Using the Extension

1. **Navigate to Practice Panther invoices page:**
   ```
   https://app.practicepanther.com/invoices
   ```

2. **Kathy automatically injects:**
   - 🅺 **Green "K" badge** next to each invoice (opens side panel)
   - 💳 **"Collect with Kathy"** button (starts payment flow)

3. **View invoice details:**
   - Click the **K badge** to open the contextual side panel
   - Browse tabs: Overview, Payments, Notes, Workflows
   - Use quick actions: Refresh data, mark as reviewed

4. **Collect payment:**
   - Click **"Collect with Kathy"**
   - Customer payment page opens in new tab
   - Extension polls for payment status
   - **Side panel automatically opens** when payment succeeds
   - Consent modal appears: `Mark invoice #I-2 as paid for $125.00?`
   - **Confirm** → Invoice marked as paid, panel updates
   - **Cancel** → Payment moved to manual review dashboard

5. **Keyboard shortcuts:**
   - `Esc` - Close side panel
   - More shortcuts coming soon (Alt+K to toggle panel)

### Visual Configuration

Instead of manually entering column indices:

1. Go to extension options (right-click extension icon → Options)
2. Click **"Visual Configuration"**
3. Navigate to Practice Panther invoices page
4. Click on cells to select columns for Invoice ID, Amount, and Status
5. Configuration saves automatically

See [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) for details.

### Validation Checklist

The extension passes the following validation criteria:

✅ **Buttons appear next to status text** (immediately left of "SAVED")
✅ **Alert shows correct payment info** (e.g., `Payment for Invoice #I-2 ($12500.00)`)
✅ **Consent modal displays exact text** (`Mark invoice #I-2 as paid for $12,500.00?`)
✅ **Console logs use "Kathy:" prefix** with zero DevTools errors
✅ **Cloud log format**:
```javascript
{
  action: "mark_paid",
  invoiceId: "I-2",
  amount: 12500.00,
  timestamp: "2026-01-05T12:34:56.789Z"
}
```

## DOM Structure & Limitations

### Current DOM Structure

The extension targets this specific DOM structure:
```html
<tr role="row">
  <td><!-- Cell 0: Usually invoice number --></td>
  <td><!-- Cell 1: Other info --></td>
  <td><!-- Cell 2: Balance amount --></td>
  <td><!-- Cell 3: Status (e.g., "SAVED") --></td>
</tr>
```

**Critical assumptions:**
- Rows are identified by `tr[role="row"]` selector
- Status column is the **4th visible cell** (index 3)
- Balance is parsed from any cell containing a dollar amount
- Invoice ID matches the pattern `I-\d+`

### DOM Change Detection

If Practice Panther updates their UI structure, the extension will:
1. Log: `Kathy: DOM structure changed - contact support`
2. **Disable automatic button injection** for affected rows
3. Continue working for rows that match the expected structure

**This is a safety feature** - the extension will not attempt blind injections that could break the UI.

### SPA Navigation Support

The extension handles Practice Panther's single-page application (SPA) architecture:
- **MutationObserver**: Watches for dynamically added/removed rows
- **URL change detection**: Re-scans when navigating to `/invoices` routes
- **Debouncing**: Prevents excessive re-scanning (500ms delay)

## Security & Privacy

### Data Handling
- ❌ **No card data access**: The extension never reads or writes payment fields
- ❌ **No API scraping**: Only interacts with visible DOM elements
- ❌ **No persistent storage**: No `localStorage`, `chrome.storage`, or cookies
- ✅ **User consent required**: Every "mark paid" action requires explicit confirmation

### Future Payment Integration
The extension is designed to integrate with **RunPayments hosted pages**:
- Payment processing would use `window.open()` to a hosted page
- The extension would **never inspect** the hosted page contents
- Card data remains isolated from the extension

### Logging
Cloud logs contain only:
- Action type (`"mark_paid"`)
- Invoice ID
- Amount (after user confirmation)
- Timestamp

**No personal information, credentials, or card data is ever logged.**

## Troubleshooting

### Buttons don't appear
1. Check console for `Kathy:` logs
2. Verify you're on `https://app.practicepanther.com/invoices`
3. Look for `DOM structure changed` warnings
4. Ensure invoices have balances > $0

### Cloud logging fails
1. Check that the logging endpoint is running at `http://localhost:3000/kathy-log`
2. Look for CORS errors in the console
3. Verify `host_permissions` includes `http://localhost/*` in `manifest.json`

### Extension doesn't load
1. Check Chrome version (requires 120+)
2. Verify Developer Mode is enabled
3. Check for errors in `chrome://extensions/`
4. Try running `npm run build` again

## Development

### Project Structure
```
kathyv3/
├── public/
│   ├── manifest.json          # Extension manifest (MV3)
│   └── payment-icon.png       # Payment button icon
├── assets/
│   └── icon.png               # Extension icon
├── src/
│   ├── background.ts          # Background service worker
│   ├── components/
│   │   ├── KathyPanel.tsx     # Contextual side panel UI
│   │   └── PanelManager.tsx   # Panel state manager
│   ├── contents/
│   │   ├── practice-panther.tsx   # Main content script
│   │   └── configurator.tsx       # Visual configuration tool
│   ├── options.tsx            # Extension options page
│   └── options.css            # Options page styles
├── kathy-cloud/               # Backend API
│   ├── app/
│   │   ├── api/
│   │   │   ├── payments/      # Payment endpoints
│   │   │   ├── entities/      # Entity data endpoints
│   │   │   ├── actions/       # Action triggers
│   │   │   └── webhooks/      # RunPayments webhooks
│   │   └── dashboard/         # Admin dashboard
│   ├── lib/
│   │   ├── prisma.ts          # Database client
│   │   ├── auth.ts            # API authentication
│   │   └── runpayments-real.ts # RunPayments integration
│   └── prisma/
│       └── schema.prisma      # Database schema
├── build/                      # Build output (after npm run build)
│   └── chrome-mv3-prod/        # Production build for Chrome
├── KATHY_UX_GUIDE.md          # UX features documentation
├── API_REFERENCE.md           # Backend API docs
└── README.md
```

### Building
```bash
npm run build      # Production build
npm run dev        # Development build with hot reload
npm run package    # Create .zip for Chrome Web Store
```

### Key Files

**Extension:**
- **practice-panther.tsx**: DOM injection, button/badge creation, payment flow, SPA handling
- **KathyPanel.tsx**: Contextual side panel with tabs (Overview, Payments, Notes, Workflows)
- **PanelManager.tsx**: Global panel state manager with event system
- **configurator.tsx**: Interactive visual configuration tool
- **background.ts**: Cloud logging and message forwarding
- **options.tsx**: Extension settings page

**Backend:**
- **app/api/payments/**: Payment session creation, status polling, confirm/cancel
- **app/api/entities/**: Enriched entity data for side panel
- **app/api/actions/**: Workflow triggers (add to sequence, create note, etc.)
- **app/api/webhooks/payment/**: RunPayments webhook handler
- **lib/auth.ts**: Bearer token authentication middleware
- **lib/runpayments-real.ts**: RunPayments hosted payment page integration

## Technical Specifications

| Component | Specification |
|-----------|--------------|
| Framework | Plasmo v0.90.5+ with React/Vite |
| Manifest | Chrome Extension Manifest V3 |
| Permissions | `activeTab`, `scripting` only |
| Host Permissions | `http://localhost/*` for logging |
| Target Site | `https://app.practicepanther.com/*` |
| Run At | `document_idle` |
| React Version | 18.3.1 |
| TypeScript | 5.9.3 |

## Documentation

- **[KATHY_UX_GUIDE.md](./KATHY_UX_GUIDE.md)** - Complete guide to contextual panels and inline actions
- **[kathy-cloud/API_REFERENCE.md](./kathy-cloud/API_REFERENCE.md)** - Backend API documentation
- **[CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)** - Visual configuration setup
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing and validation
- **[FULL_SYSTEM_README.md](./FULL_SYSTEM_README.md)** - Complete system architecture

## Roadmap

### ✅ Phase 1: Practice Panther MVP (Complete)
- Contextual side panel with tabs
- Inline badges and action buttons
- RunPayments integration
- Real-time payment status
- Consent modal with audit logging

### 🔄 Phase 2: LinkedIn Integration (In Progress)
- Add Kathy badge to LinkedIn profiles
- Enrich contact data in side panel
- Quick actions: "Add to Sequence", "Save to Kathy"

### 📋 Phase 3: Multi-Platform (Planned)
- Gmail integration
- Salesforce/HubSpot support
- Multi-step workflows
- Notes and collaboration

### 🚀 Phase 4: Advanced Features (Planned)
- Keyboard shortcuts (Alt+K to toggle panel)
- Pin/unpin panel
- Custom panel layouts
- Real-time collaboration

## Support

If you encounter issues:
1. Check the browser console for `Kathy:` logs
2. Verify Kathy Cloud backend is running at `http://localhost:3000`
3. Review [KATHY_UX_GUIDE.md](./KATHY_UX_GUIDE.md) for troubleshooting
4. Check [API_REFERENCE.md](./kathy-cloud/API_REFERENCE.md) for backend issues

## License

ISC

---

**Remember: This is a consent layer with modern UX, not an automation tool. Every action requires explicit user interaction and confirmation.**

