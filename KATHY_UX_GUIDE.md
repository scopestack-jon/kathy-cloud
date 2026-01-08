# Kathy UX Guide: Contextual Panels & Inline Actions

This guide explains the new Apollo-style UX features in Kathy, designed to reduce friction and keep users in their workflow.

## Overview

Kathy now provides a **contextual side panel** and **inline actions** that appear directly within the apps you use (starting with Practice Panther). This eliminates the need to copy-paste data or switch between tools.

---

## Key Features

### 1. Contextual Side Panel

A right-side drawer that slides in to show enriched data about any entity (invoice, contact, company) without leaving your current page.

**How it works:**
- Click the **Kathy badge** (green "K" button) next to any invoice
- Panel slides in from the right
- Shows tabs: Overview, Payments, Notes, Workflows
- Close with `Esc` key or click backdrop

**What you see in the panel:**
- **Overview Tab**: Entity details, status, summary stats
- **Payments Tab**: Complete payment history with timestamps
- **Notes Tab**: Coming soon - internal notes/comments
- **Workflows Tab**: Coming soon - automation triggers

### 2. Inline Action Buttons

Buttons that appear directly in your workflow (e.g., next to invoice status in Practice Panther).

**Current actions:**
- **"Collect with Kathy"** button: Start payment flow
- **Kathy badge**: Open contextual panel

**Button states:**
- Default: Green "Collect with Kathy"
- Processing: "Processing..." (disabled)
- Waiting: "Waiting for payment..."
- Complete: "Paid ✓" (green)

### 3. Integrated Payment Flow

When you collect payment:
1. Click "Collect with Kathy"
2. Payment link opens in new tab
3. Customer completes payment
4. **Panel automatically opens** showing payment details
5. Consent modal appears
6. Confirm → Invoice marked as paid in UI and panel updates
7. Cancel → Payment moved to manual review in Kathy dashboard

---

## Using the Side Panel

### Opening the Panel

**Method 1: Click the Kathy badge**
- Look for the green circular "K" button next to any invoice
- Click to open panel with that invoice's data

**Method 2: Automatic on payment**
- When a payment completes, panel opens automatically
- Shows real-time payment status

### Panel Tabs

#### Overview
- Entity name and type
- Key metrics (amount, status)
- Summary statistics (total paid, session count)
- Quick action buttons

#### Payments
- Full payment history
- Status badges (confirmed, pending, failed)
- Timestamps and transaction IDs
- Amount details

#### Notes (Coming Soon)
- Add internal notes
- Comment threads
- Tag team members

#### Workflows (Coming Soon)
- Trigger sequences
- Add to campaigns
- Schedule follow-ups

### Quick Actions

From the Overview tab:
- **Refresh Invoice Data**: Reload latest info from Kathy Cloud
- **Mark as Reviewed**: Log that you've reviewed this entity

More actions coming soon:
- Sync to CRM
- Add to sequence
- Create note

---

## For Developers

### Architecture

```
┌─────────────────────┐
│  Practice Panther   │
│      (Host App)     │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │   Content   │
    │   Script    │
    └──────┬──────┘
           │
    ┌──────┴──────────────┐
    │                     │
┌───▼────┐         ┌─────▼──────┐
│ Inline │         │   Panel    │
│Actions │         │  Manager   │
└───┬────┘         └─────┬──────┘
    │                    │
    └─────────┬──────────┘
              │
         ┌────▼─────┐
         │  Kathy   │
         │  Cloud   │
         │   API    │
         └──────────┘
```

### Component Structure

**`/src/components/KathyPanel.tsx`**
- Main panel UI component
- Tabs: Overview, Payments, Notes, Workflows
- Fetches data from Kathy Cloud API

**`/src/components/PanelManager.tsx`**
- Singleton manager for panel state
- Event system for cross-script communication
- Methods: `open()`, `close()`, `update()`, `toggle()`

**`/src/contents/practice-panther.tsx`**
- Content script for Practice Panther
- Injects inline buttons and badges
- Manages payment flow
- Integrates with panel manager

### Panel Manager API

```typescript
import { panelManager, PanelEntity } from '@/components/PanelManager'

// Open panel with entity
const entity: PanelEntity = {
  type: "invoice",
  id: "I-123",
  displayName: "Invoice I-123",
  data: {
    invoiceId: "I-123",
    amount: 25000,
    status: "pending",
    lastUpdated: new Date().toISOString()
  }
}
panelManager.open(entity)

// Update panel data
panelManager.update(updatedEntity)

// Close panel
panelManager.close()
```

### Kathy Cloud API

#### Get Entity Data
```bash
GET /api/entities/{type}/{id}
Authorization: Bearer {API_SECRET_KEY}
```

**Response for invoices:**
```json
{
  "type": "invoice",
  "id": "I-123",
  "data": {
    "invoiceId": "I-123",
    "paymentSessions": [...],
    "auditLogs": [...],
    "summary": {
      "totalPaid": 25000,
      "totalSessions": 3,
      "latestStatus": "confirmed",
      "lastUpdated": "2024-01-08T..."
    }
  }
}
```

#### Trigger Actions
```bash
POST /api/actions
Authorization: Bearer {API_SECRET_KEY}
Content-Type: application/json

{
  "action": "add_to_sequence",
  "entityType": "invoice",
  "entityId": "I-123",
  "metadata": {...}
}
```

**Available actions:**
- `add_to_sequence`: Add to workflow
- `create_note`: Create a note
- `sync_to_crm`: Sync to external CRM
- `mark_as_reviewed`: Mark as reviewed

---

## Future Enhancements

### Phase 2: LinkedIn Integration
- Add Kathy badge to LinkedIn profiles
- Enrich contact data from panel
- Quick actions: "Add to Sequence", "Save to Kathy"

### Phase 3: Multi-Platform
- Gmail integration
- Salesforce/HubSpot support
- Multi-step workflows

### Phase 4: Advanced Features
- Keyboard shortcuts (e.g., `Alt+K` to toggle)
- Pin/unpin panel
- Custom panel layouts
- Real-time collaboration

---

## Tips & Best Practices

1. **Use keyboard shortcuts**: Press `Esc` to close the panel quickly
2. **Keep panel open**: The panel stays open as you scroll, so you can reference data while working
3. **Quick actions**: Use the Overview tab for fast actions without navigating away
4. **Payment flow**: After initiating payment, keep the Practice Panther tab open to see real-time updates

---

## Troubleshooting

**Panel not appearing?**
- Ensure the extension is loaded
- Refresh the page
- Check browser console for errors

**Data not loading?**
- Verify Kathy Cloud is running (`npm run dev` in `kathy-cloud/`)
- Check API credentials in environment variables
- Inspect network tab for failed requests

**Badge not clickable?**
- Ensure invoice has valid data
- Check if another modal is blocking clicks
- Try refreshing the page

---

## Support

For issues or feature requests, contact the Kathy team or open an issue in the repository.



