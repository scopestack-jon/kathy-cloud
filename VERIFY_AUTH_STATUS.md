# Verify Extension Authentication

## Check 1: Extension Popup Details

Open the extension popup and tell me:
1. Does it show "Logged in as [your-email]"?
2. Does it show an Organization ID?
3. What does the Organization ID look like? (a UUID like: abc123-def456-...)

## Check 2: Chrome Storage Inspection

1. Open Chrome DevTools (F12)
2. Go to the **Application** tab
3. Expand **Storage** → **Extension Storage** on the left
4. Find your Kathy extension ID
5. Look for these keys:
   - `authToken` (should have a long JWT token)
   - `user` (should have user object with email, id)
   - `organizationId` (should have a UUID)

## Check 3: Test on Practice Panther

1. Go to: https://app.practicepanther.com
2. Navigate to any page with invoices
3. Do you see the green "K" badges next to invoice rows?
4. Can you click a "K" badge and see the Kathy panel?

---

Please tell me the results of these checks!
