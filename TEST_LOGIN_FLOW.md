# Testing Kathy Extension Login Flow

## Steps to Test:

1. **Open the Extension Popup**
   - Click the Kathy icon (green K) in Chrome toolbar
   
2. **Click "Sign In / Sign Up"**
   - This should open a NEW TAB to: https://kathy-cloud.vercel.app/auth/login
   
3. **Sign In**
   - Enter your email/password
   - Click "Sign In"
   
4. **Expected Behavior:**
   - You should be redirected to: https://kathy-cloud.vercel.app/auth/callback
   - You should see console messages with 🟢 emojis (open DevTools)
   - A green success message: "✅ Signed in as your-email! Closing in 3s..."
   - The tab should auto-close after 3 seconds
   
5. **Open Extension Popup Again**
   - Click the Kathy icon
   - You should now see: "Logged in as your-email@example.com"
   - Your Organization ID should be displayed

## If It Doesn't Work:

- Open DevTools Console on the callback page
- Look for error messages
- Tell me what you see in the console
