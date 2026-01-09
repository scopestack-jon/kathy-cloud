# Debug Authentication Issue

## Quick Check:

1. **Right-click the Kathy popup** → **Inspect**
2. **Go to Console tab**
3. **Look for error messages** starting with "Kathy:"
4. **Tell me what you see**

Common errors to look for:
- "Failed to fetch user profile"
- "Error fetching user profile"
- Any 401/403/500 errors
- CORS errors

## Also Check Chrome Storage:

1. Open DevTools (F12)
2. Go to **Application** tab
3. **Storage** → **Extension Storage** → Find Kathy extension
4. **Tell me if you see:**
   - `authToken` - Is it still there?
   - `user` - Is it still there?
   - `organizationId` - Is it there now?

