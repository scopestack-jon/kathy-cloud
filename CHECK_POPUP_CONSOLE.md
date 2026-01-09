# Check Popup Console for Errors

## Steps:

1. **Close the Kathy popup** if it's open
2. **Right-click the Kathy icon** in the Chrome toolbar
3. **Click "Inspect popup"**
4. **Console tab should open**
5. **Click the Kathy icon again** to open the popup
6. **Look at the Console** for messages starting with "Kathy:"

## What to Look For:

Look for these specific messages:
- `Kathy: Checking auth status...` - Shows what's in storage
- `Kathy: Have token but no organizationId, fetching from API...` - Confirms API call
- `Kathy: Failed to fetch user profile:` **[ERROR MESSAGE]** - This is what we need!
- Any red error messages

## Copy and Paste:

Copy the full error message from the console and send it to me!
