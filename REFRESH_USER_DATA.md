# Force Refresh User Data

## Option 1: Logout and Login Again (Recommended)
1. Click **Logout** in the popup
2. Click **Sign In / Sign Up**
3. Sign in with your credentials
4. Should now show: "Welcome, Jon! 👋"

## Option 2: Clear Extension Storage
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. **Storage** → **Extension Storage** → Find Kathy
4. Right-click → **Clear**
5. Reload the extension
6. Login again

## Option 3: Manual Storage Clear
1. Right-click Kathy popup → **Inspect**
2. Go to **Console**
3. Paste and run:
```javascript
chrome.storage.local.clear(() => console.log('Cleared!'))
```
4. Close popup, open again
5. Login

Try Option 1 first - just logout and login again!
