# PRD: SmartMoving API Integration

## Overview

Kathy Cloud needs to integrate with the SmartMoving API to automatically update job status/stage when payments are successfully processed. This enables seamless workflow automation for moving companies using SmartMoving as their CRM - when a customer pays an invoice through Kathy, the corresponding job in SmartMoving will automatically advance to the appropriate stage.

**Problem:** Currently, when a payment is marked as paid in Kathy, there is no automatic synchronization with SmartMoving. Users must manually update job statuses in SmartMoving, creating extra work and potential for human error.

**Solution:** Automatic API integration that updates SmartMoving job status when payment is confirmed in Kathy Cloud.

## Goals

- **Goal 1:** Enable automatic job status updates in SmartMoving when payments are marked as paid in Kathy Cloud
- **Goal 2:** Support per-organization SmartMoving API configuration for multi-tenant flexibility
- **Goal 3:** Use invoice number matching to reliably map Kathy payments to SmartMoving jobs
- **Goal 4:** Implement MVP scope with simple, reliable status updates and basic error handling

## User Stories

### US-001: Add SmartMoving Configuration to Organization Settings

**As an** organization administrator
**I want** to configure SmartMoving API credentials for my organization
**So that** Kathy can automatically update job statuses in SmartMoving when payments are processed

**Acceptance Criteria:**
- [ ] Organization.settings JSON field supports SmartMoving configuration with structure: `{ smartMoving: { apiKey: string, enabled: boolean, targetStage?: string } }`
- [ ] Database schema remains compatible with existing organizations (no breaking changes)
- [ ] Configuration is stored securely and isolated per organization
- [ ] npm run typecheck passes

**Technical Notes:**
- Use existing `Organization.settings` JSONB field in schema (schema.prisma:28)
- No migration needed - JSON field is already nullable
- Configuration structure allows future expansion (e.g., custom field mappings, webhook URLs)

---

### US-002: Create SmartMoving API Client Library

**As a** developer
**I want** a reusable SmartMoving API client
**So that** I can reliably interact with SmartMoving's API for job status updates

**Acceptance Criteria:**
- [ ] Create `/kathy-cloud/lib/smartmoving.ts` with typed client class
- [ ] Implement authentication using API key from organization settings
- [ ] Implement `updateJobStatus(jobId: string, status: string)` method with proper error handling
- [ ] Implement `findJobByInvoiceNumber(invoiceNumber: string)` method to locate jobs by invoice
- [ ] Include retry logic for transient failures (3 retries with exponential backoff)
- [ ] Include detailed error logging for debugging
- [ ] TypeScript interfaces match SmartMoving API response structure
- [ ] npm run typecheck passes

**Technical Notes:**
- Base URL: Likely `https://api.smartmoving.com/v1` or similar (verify from developer.smartmoving.com)
- Authentication: Bearer token in Authorization header
- Error handling: Distinguish between 4xx (client errors) and 5xx (server errors)
- Rate limiting: Implement basic rate limit handling if needed

**Example API Usage:**
```typescript
const client = new SmartMovingClient(apiKey)
const job = await client.findJobByInvoiceNumber('INV-12345')
await client.updateJobStatus(job.id, 'paid')
```

---

### US-003: Trigger SmartMoving Update on Payment Confirmation

**As a** system
**I want** to automatically call SmartMoving API when payments are confirmed
**So that** job statuses are updated without manual intervention

**Acceptance Criteria:**
- [ ] When payment status changes to `paid_and_confirmed` in `/api/payments/[id]/confirm`, trigger SmartMoving update
- [ ] Retrieve organization's SmartMoving configuration from `Organization.settings`
- [ ] Skip SmartMoving update if organization doesn't have SmartMoving enabled
- [ ] Use `paymentSession.invoiceId` to find matching job in SmartMoving
- [ ] Update job status to configured target stage (default: "paid" or equivalent)
- [ ] Log successful updates to AuditLog with action: `smartmoving_sync_success`
- [ ] Log failed updates to AuditLog with action: `smartmoving_sync_failed` and error details
- [ ] Payment confirmation still succeeds even if SmartMoving update fails (non-blocking)
- [ ] npm run typecheck passes

**Technical Notes:**
- Hook into existing confirm payment flow at `/kathy-cloud/app/api/payments/[id]/confirm/route.ts:64-67`
- Add SmartMoving call after line 67 (after status update but before audit log)
- Use async call with try-catch to prevent payment confirmation failure
- Store SmartMoving job ID in audit log metadata for future reference

**Error Handling:**
- Network failures: Log error, don't block payment confirmation
- Job not found: Log warning, may indicate invoice number mismatch
- Authentication failures: Log error with clear message for admin
- API rate limits: Log error with retry recommendation

---

### US-004: Add SmartMoving Configuration UI

**As an** organization administrator
**I want** a settings page to configure SmartMoving integration
**So that** I can enable and manage the SmartMoving API connection

**Acceptance Criteria:**
- [ ] Add SmartMoving section to organization settings page
- [ ] Form fields: API Key (password input), Enabled toggle, Target Stage (text input, optional)
- [ ] "Test Connection" button to verify API credentials work
- [ ] Display success/error message after testing connection
- [ ] Save configuration to `Organization.settings.smartMoving`
- [ ] Show configuration status (enabled/disabled, last successful sync timestamp)
- [ ] Input validation: API key required if enabled is true
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

**Technical Notes:**
- Create new route: `/api/organizations/[id]/settings/smartmoving` for save/test operations
- Test connection endpoint should call SmartMoving API to validate credentials
- Use existing settings page pattern (if exists) or create new settings section
- Secure API key display (show only last 4 characters: `sk_****1234`)

---

### US-005: Add SmartMoving Sync Status to Payment Dashboard

**As an** organization administrator
**I want** to see if SmartMoving sync succeeded for each payment
**So that** I can identify and troubleshoot any synchronization issues

**Acceptance Criteria:**
- [ ] Display SmartMoving sync status indicator on payment list/detail views
- [ ] Status indicators: Success (green checkmark), Failed (red X), Not Configured (gray dash), Pending (yellow clock)
- [ ] Click status indicator to show audit log details for that sync attempt
- [ ] Show error message if sync failed
- [ ] Include "Retry Sync" button for failed syncs
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

**Technical Notes:**
- Query AuditLog table for `smartmoving_sync_success` or `smartmoving_sync_failed` actions
- Filter by `paymentSessionId` to find relevant sync attempts
- Display most recent sync attempt status
- Retry button should call SmartMoving API again with same parameters

---

## Functional Requirements

1. **FR-001:** The system shall store SmartMoving API credentials securely in the Organization.settings JSONB field
2. **FR-002:** The system shall support per-organization configuration allowing different SmartMoving accounts per customer
3. **FR-003:** The system shall automatically attempt to update SmartMoving job status when payment is confirmed (status: `paid_and_confirmed`)
4. **FR-004:** The system shall match Kathy payments to SmartMoving jobs using invoice number as the primary identifier
5. **FR-005:** The system shall log all SmartMoving API calls (success and failure) to the AuditLog table
6. **FR-006:** The system shall not block payment confirmation if SmartMoving API call fails
7. **FR-007:** The system shall provide a settings UI for administrators to configure SmartMoving integration
8. **FR-008:** The system shall provide visibility into SmartMoving sync status on the payment dashboard

## Non-Functional Requirements

1. **NFR-001 - Security:** SmartMoving API keys must be stored securely and never exposed in client-side code or logs
2. **NFR-002 - Reliability:** SmartMoving API failures must not prevent payment confirmation (graceful degradation)
3. **NFR-003 - Performance:** SmartMoving API calls should complete within 5 seconds or timeout with retry
4. **NFR-004 - Observability:** All SmartMoving API interactions must be logged to AuditLog for debugging and compliance
5. **NFR-005 - Maintainability:** SmartMoving client code should be modular and testable, separate from payment logic

## Non-Goals

The following are explicitly **out of scope** for this MVP:

- **Bidirectional sync:** We will NOT pull job data from SmartMoving into Kathy (read-only on SmartMoving side)
- **Real-time webhooks:** We will NOT implement SmartMoving webhooks to receive job updates
- **Custom field mapping:** We will NOT support mapping custom fields between systems (invoice number only)
- **Batch sync:** We will NOT implement bulk sync for historical payments
- **Multi-stage workflows:** We will NOT support complex stage transitions (single status update only)
- **SmartMoving job creation:** We will NOT create new jobs in SmartMoving, only update existing ones

## Design Considerations

### API Configuration UI
- Simple form with clear field labels
- Password-style input for API key (with show/hide toggle)
- Visual feedback for test connection (loading spinner, success/error messages)
- Help text explaining where to find API credentials in SmartMoving

### Payment Dashboard Integration
- Non-intrusive status indicator (icon-based)
- Tooltip on hover showing sync timestamp and status
- Modal or slide-out panel for detailed error messages
- Consistent with existing Kathy Cloud design patterns

### Error States
- Clear error messages for common failure scenarios:
  - "SmartMoving API key invalid"
  - "Job not found for invoice number"
  - "SmartMoving API unavailable"
  - "Network timeout"

## Technical Considerations

### Architecture
- **Layer separation:** SmartMoving client library (`lib/smartmoving.ts`) separate from API routes
- **Error boundaries:** Wrap SmartMoving calls in try-catch to prevent payment flow disruption
- **Configuration validation:** Check for valid config before attempting API calls

### Data Model Changes
- **No schema migrations required:** Use existing `Organization.settings` JSONB field
- **Settings structure:**
  ```typescript
  interface OrganizationSettings {
    smartMoving?: {
      apiKey: string
      enabled: boolean
      targetStage?: string // Default: "paid"
      lastSyncAt?: string // ISO timestamp
    }
  }
  ```

### Integration Points
- **Primary hook:** `/api/payments/[id]/confirm` route after status update to `paid_and_confirmed`
- **Database tables:** Organization (settings), PaymentSession (invoiceId), AuditLog (sync tracking)
- **External API:** SmartMoving REST API (developer.smartmoving.com)

### Error Handling Strategy
1. **Network failures:** Retry 3 times with exponential backoff (1s, 2s, 4s)
2. **4xx errors:** Log and don't retry (client error, likely config issue)
3. **5xx errors:** Retry up to 3 times (server error, likely transient)
4. **Timeout:** 5 second timeout, then log as failed
5. **All failures:** Log to AuditLog with full error details for admin review

### Security Considerations
- API keys stored in encrypted database column (JSONB field)
- API keys never logged or exposed in responses
- Rate limiting on settings update endpoint to prevent abuse
- Validate API key format before storage

### Testing Strategy
- Unit tests for SmartMoving client library
- Integration tests for payment confirmation flow with SmartMoving enabled/disabled
- Manual testing with actual SmartMoving API (staging environment if available)
- Error scenario testing (invalid credentials, network failures, timeouts)

## Open Questions

1. **What is the exact SmartMoving API endpoint for updating job status?**
   - Need to verify from developer.smartmoving.com documentation
   - Likely: `PUT /api/v1/jobs/{jobId}` or `PATCH /api/v1/jobs/{jobId}/status`

2. **What is the exact field name for invoice number in SmartMoving jobs?**
   - Need to verify from API documentation
   - Likely: `invoice_number`, `invoiceNumber`, or similar

3. **What are the valid job status/stage values in SmartMoving?**
   - Need to verify valid status values from API documentation
   - Likely: "paid", "completed", "closed", or similar

4. **Does SmartMoving API require any specific headers or authentication format?**
   - Need to verify: Bearer token, API key header, or other auth method
   - Need to verify: Rate limiting policies

5. **Should we store the SmartMoving job ID in our database for faster lookups?**
   - Current plan: Lookup by invoice number each time
   - Alternative: Store jobId in PaymentSession for direct updates
   - Decision: Start with invoice number lookup (simpler), add jobId caching if needed

## Success Metrics

- **Adoption:** 100% of SmartMoving-enabled organizations configure the integration
- **Reliability:** 95%+ success rate for SmartMoving API calls
- **Performance:** Average SmartMoving API response time < 2 seconds
- **User satisfaction:** Zero manual status updates needed after integration is enabled

## Dependencies

- SmartMoving API access (requires Growth Plan or Premium API tier)
- SmartMoving API documentation at developer.smartmoving.com
- Valid SmartMoving API credentials for testing

## Timeline Considerations

**Phase 1 (MVP):** Stories US-001 through US-003
- Core functionality: auto-update SmartMoving on payment confirmation
- Enables basic workflow automation
- No UI changes required

**Phase 2 (Full):** Stories US-004 and US-005
- Admin configuration UI
- Sync status visibility
- Production-ready for customer deployment

## Related Documentation

- SmartMoving API Documentation: https://developer.smartmoving.com
- Kathy Cloud Architecture: `/kathy-cloud/README.md`
- Authentication Guide: `/AUTHENTICATION_GUIDE.md`
