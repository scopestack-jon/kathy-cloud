# Organization Name Sign-Up Flow

## What Changed:

✅ Sign-up now asks for **Organization Name**
✅ New users will have properly named organizations
✅ Organization name is stored in user metadata and used when creating the org

## For Existing Users (You):

Your organization was auto-created with a generic name. To update it:

### Option 1: Via Database (Quick)
Run this in Supabase SQL Editor:

```sql
-- Find your organization ID first
SELECT id, name, slug FROM organizations WHERE name LIKE '%agently%';

-- Update the organization name
UPDATE organizations 
SET name = 'Your Actual Firm Name'
WHERE id = 'YOUR_ORG_ID_HERE';
```

### Option 2: Via API (We can build this)
Create a `/api/organizations/update` endpoint to let users rename their org from the dashboard.

## Testing New Sign-Up Flow:

1. **Logout** from the extension and dashboard
2. **Sign up with a new email** (e.g., test2@agently.bot)
3. **Fill in**:
   - Email
   - Password
   - **Organization Name** (NEW!)
4. **Verify**: Check the popup shows the correct organization name

## Next Steps:

1. Test the new sign-up flow with a fresh account
2. Update your existing organization name (Option 1 above)
3. Reload the extension to see the updated name

Would you like me to:
- Build an "Edit Organization" feature in the dashboard?
- Update your existing organization name now?
