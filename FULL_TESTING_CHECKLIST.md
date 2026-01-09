# Kathy Extension - Full Testing Checklist

## Test 1: Verify Extension Auth Status ✓

1. **Reload the extension** in `chrome://extensions`
2. **Open the Kathy popup** (click the K icon)
3. **Verify you see:**
   - ✅ "Logged in as jon@agently.bot"
   - ✅ Organization ID displayed
   - ✅ Green success background

---

## Test 2: Configure an Application

### Option A: Configure Practice Panther (Recommended)

1. **Go to Practice Panther**: https://app.practicepanther.com
2. **Open the popup** → Click **"Settings"**
3. **Click** "✨ Visual Configuration"
4. **Follow the on-screen prompts** to select:
   - Invoice ID column
   - Amount column  
   - Status/Action column
5. **Verify**: Configuration saves successfully (no "Unauthorized" error)

### Option B: Configure Any Other Application

1. **Go to any web app** with a table of invoices/items
2. **Follow the same steps** as Option A
3. **Enter an application name** when prompted

---

## Test 3: Verify "K" Badges Appear

1. **Refresh the configured application page**
2. **Look for green "K" badges** next to invoice rows
3. **Click a "K" badge**
4. **Verify**: Kathy panel opens on the right side

---

## Test 4: Create a Payment Session

1. **Click a "K" badge** to open the panel
2. **Click "Collect Payment"** button
3. **Verify**: 
   - Payment URL opens in new tab
   - RunPayments payment page loads
   - Back in the app, badge shows "⏳ Pending"

---

## Test 5: Check Dashboard

1. **Go to**: https://kathy-cloud.vercel.app/dashboard
2. **Verify**:
   - Payment session appears in the table
   - Organization name is displayed
   - Application name is shown

---

## 🐛 If Something Doesn't Work:

- Open browser DevTools Console (F12)
- Look for "Kathy:" messages
- Take a screenshot
- Report what you see!

