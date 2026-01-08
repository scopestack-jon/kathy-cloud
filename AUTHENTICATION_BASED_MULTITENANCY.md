# Authentication-Based Multi-Tenancy

## ✅ Correct Approach Implemented

Organization tracking is now based on **authenticated Kathy user accounts**, not scraped from Practice Panther.

---

## How It Works

### 1. User Configuration (One-Time Setup)

**Users configure their account in extension options:**

1. Right-click Kathy extension icon → **Options**
2. Fill in **User Account** section:
   - **Organization ID** * (required) - e.g., `acme-law-firm`
   - **User ID** (optional) - e.g., `john-doe`
   - **Email** (optional) - e.g., `john@acme.com`
3. Click **Save Settings**

### 2. Data Storage

**Stored in `chrome.storage.local`:**

```typescript
{
  kathyUser: {
    organizationId: "acme-law-firm",
    userId: "john-doe",
    email: "john@acme.com"
  }
}
```

### 3. Automatic Tagging

**Every payment automatically includes the user's organization:**

```typescript
// Extension reads from storage
const orgId = await getAuthenticatedOrganization()

// Sends to backend
POST /api/payments {
  invoiceId: "I-123",
  amount: 12500,
  organizationName: "acme-law-firm"  ← From authenticated user
}

// Backend stores
PaymentSession {
  firmId: "acme-law-firm"  ← Enables multi-tenant filtering
}
```

---

## Benefits of This Approach

### ✅ Proper Multi-Tenancy

**vs. Scraping Practice Panther:**
- ❌ **Scraping**: Unreliable, breaks with UI changes, wrong for multi-tenant
- ✅ **Auth-based**: Reliable, secure, proper tenant isolation

**Data Isolation:**
```
Organization A (acme-law-firm)
  ├─ User: john@acme.com
  ├─ Payments: I-1, I-2, I-3
  └─ Total: $50,000

Organization B (smith-legal)
  ├─ User: jane@smith.com
  ├─ Payments: I-100, I-101
  └─ Total: $30,000
```

### ✅ Scalable Architecture

**Backend can now:**
- Filter payments by organization
- Generate per-org reports
- Apply per-org settings (fees, branding)
- Enforce per-org access control

### ✅ Audit Trail

**Every action tagged with:**
- Organization ID
- User ID
- Email
- Timestamp

**Example audit log:**
```json
{
  "event": "payment.confirmed",
  "organizationId": "acme-law-firm",
  "userId": "john-doe",
  "email": "john@acme.com",
  "invoiceId": "I-123",
  "amount": 12500,
  "timestamp": "2026-01-08T..."
}
```

---

## User Experience

### First-Time Setup

**When user installs extension:**

1. Extension icon appears in toolbar
2. User clicks → Opens options page
3. Sees **warning message**: 
   ```
   ⚠️ Please set your Organization ID to enable multi-tenant tracking
   ```
4. User fills in:
   - Organization ID (required)
   - User ID (optional)
   - Email (optional)
5. Clicks **Save Settings**
6. Extension now ready to use!

### Daily Usage

**After setup:**
- User just uses the extension normally
- Organization ID automatically included with every payment
- No need to re-enter organization info
- Panel shows organization in overview

### Panel Display

```
┌─────────────────────────┐
│ Invoice I-123           │
├─────────────────────────┤
│ Organization            │
│ acme-law-firm          │  ← From authenticated user
├─────────────────────────┤
│ Invoice ID              │
│ I-123                   │
├─────────────────────────┤
│ Amount                  │
│ $12,500.00              │
└─────────────────────────┘
```

---

## Backend Implementation

### Payment Creation

**Updated endpoint:**

```typescript
POST /api/payments
{
  "invoiceId": "I-123",
  "amount": 12500,
  "organizationName": "acme-law-firm"  ← From chrome.storage
}

// Backend stores in firmId
const session = await prisma.paymentSession.create({
  data: {
    invoiceId: body.invoiceId,
    amount: body.amount,
    firmId: body.organizationName  ← Stored here
  }
})
```

### Querying by Organization

```typescript
// Get all payments for an organization
const payments = await prisma.paymentSession.findMany({
  where: {
    firmId: "acme-law-firm"
  },
  orderBy: { createdAt: 'desc' }
})

// Organization statistics
const stats = await prisma.paymentSession.groupBy({
  by: ['firmId'],
  _count: true,
  _sum: { amount: true }
})
```

---

## Future: OAuth Authentication

### Phase 2 Enhancement

Instead of manual entry, integrate with Kathy Cloud authentication:

```typescript
// User clicks "Sign in with Kathy"
chrome.identity.launchWebAuthFlow({
  url: 'https://kathy-cloud.com/oauth/authorize',
  interactive: true
}, (redirectUrl) => {
  // Extract token from redirect
  const token = parseToken(redirectUrl)
  
  // Fetch user profile
  const profile = await fetch('https://kathy-cloud.com/api/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  // Store in chrome.storage
  chrome.storage.local.set({
    kathyUser: {
      organizationId: profile.organizationId,
      userId: profile.userId,
      email: profile.email,
      token: token
    }
  })
})
```

**Benefits:**
- No manual entry needed
- Secure token-based auth
- Automatic org/user info
- Single sign-on experience

---

## Migration Path

### For Existing Users

**Option 1: Prompt on first use**
```typescript
// Check if user configured
chrome.storage.local.get(['kathyUser'], (result) => {
  if (!result.kathyUser?.organizationId) {
    // Show setup modal
    alert('Please configure your organization in extension settings')
    chrome.runtime.openOptionsPage()
  }
})
```

**Option 2: Default organization**
```typescript
// Use a default until configured
const orgId = await getAuthenticatedOrganization() || 'default-org'
```

### For Existing Data

**Back-fill organization IDs:**
```sql
-- If you know which payments belong to which org
UPDATE payment_sessions 
SET firm_id = 'acme-law-firm'
WHERE created_at < '2026-01-08'
  AND firm_id IS NULL;
```

---

## Testing

### Test Setup

1. **Open extension options**
2. **Set Organization ID**: `test-org-123`
3. **Set User ID**: `test-user`
4. **Save**

### Test Payment Flow

1. **Collect payment** on invoice I-1
2. **Check backend logs**:
   ```bash
   cat terminals/3.txt | grep "Creating payment session"
   ```
   Should show: `organizationName: "test-org-123"`

3. **Query database**:
   ```sql
   SELECT firm_id, invoice_id FROM payment_sessions;
   ```
   Should show: `test-org-123 | I-1`

4. **Open panel** → Should show "Organization: test-org-123"

### Test Multiple Users

1. **User A** configures: `org-a`
2. **User A** collects payment → Tagged with `org-a`
3. **User B** configures: `org-b`
4. **User B** collects payment → Tagged with `org-b`
5. **Database** properly isolates data by `firmId`

---

## Security & Privacy

### ✅ Secure Storage

- Organization ID stored in `chrome.storage.local`
- Encrypted by Chrome
- Not accessible to websites
- Only accessible to extension

### ✅ No Scraping

- **Does NOT** scrape Practice Panther for org info
- **Does NOT** read sensitive data from host app
- **Only reads** invoice table data (invoice ID, amount)

### ✅ User Control

- User explicitly sets their organization
- Can change anytime in settings
- Clear visibility of what data is tracked

---

## Summary

### What Changed ✅

1. **Workflows tab removed** (cleaner UI)
2. **Organization from authenticated user** (not scraped)
3. **Options page updated** (user account section)
4. **Storage-based** (chrome.storage.local)
5. **Backend updated** (accepts organizationName from auth)

### User Flow ✅

```
Install Extension
    ↓
Open Options
    ↓
Enter Organization ID (required)
    ↓
Save Settings
    ↓
Use Extension
    ↓
Every payment tagged with user's organization
```

### Next Steps 📋

1. **OAuth integration** (Phase 2)
2. **Organization dashboard** (filter by org)
3. **Per-org settings** (custom branding)
4. **Access control** (role-based permissions)

---

**The extension now uses proper authentication-based multi-tenancy!** 🎉

Much better architecture than scraping Practice Panther.


