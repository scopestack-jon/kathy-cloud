# Kathy Extension - Configuration Guide

## 🎯 Why Configure?

The Kathy extension needs to know:
1. **Which column** contains the invoice ID (e.g., "I-123")
2. **Which column** contains the amount/balance to be paid
3. **Which column** to insert the "Collect with Kathy" button

Different applications have different table structures, so this configuration makes Kathy portable!

## ⚙️ How to Configure

### Step 1: Open Extension Options

**Method 1 - From Chrome Extensions Page:**
1. Go to `chrome://extensions/`
2. Find "Kathy" extension
3. Click **"Details"**
4. Scroll down and click **"Extension options"**

**Method 2 - Right-click Extension Icon:**
1. Right-click the Kathy extension icon in Chrome toolbar
2. Select **"Options"**

### Step 2: Find Your Column Indices

1. **Open your invoice page** (e.g., Practice Panther invoices)
2. **Right-click on any invoice row** in the table
3. Select **"Inspect"** (or press F12)
4. Look at the HTML structure - you'll see `<td>` cells
5. **Count the visible cells from left to right**, starting at 0:
   - First visible column = **0**
   - Second visible column = **1**
   - Third visible column = **2**
   - Fourth visible column = **3**
   - etc.

### Step 3: Configure Column Indices

In the options page, set:

**Invoice ID Column Index:**
- Which column contains invoice identifiers like "I-123"
- Example: If invoice IDs are in the first column, enter `0`

**Amount Column Index:**
- Which column contains the balance or amount to be paid
- Example: If amounts are in the third column, enter `2`

**Status Column Index:**
- Which column contains the status (or where you want the button)
- Example: If status is in the fourth column, enter `3`

### Step 4: Test Pattern Matching (Advanced)

If your invoice IDs or amounts use different formats:

**Invoice ID Pattern:**
- Default: `I-\d+` (matches "I-123", "I-2", etc.)
- For "INV-123": use `INV-\d+`
- For "#123": use `#\d+`

**Amount Pattern:**
- Default: `\$?([\d,]+\.?\d*)` (matches "$1,234.56" or "1234.56")
- Usually works for most currency formats

### Step 5: Save and Reload

1. Click **"💾 Save Configuration"**
2. Go back to `chrome://extensions/`
3. **Reload the Kathy extension** (click 🔄)
4. **Refresh your invoice page**
5. Buttons should now appear with correct amounts!

## 📊 Example Configurations

### Practice Panther (Default)
```
Invoice ID Column: 0 (first column)
Amount Column: 2 (third column)
Status Column: 3 (fourth column)
Invoice Pattern: I-\d+
Amount Pattern: \$?([\d,]+\.?\d*)
```

### Generic Invoice System
```
Invoice ID Column: 1 (second column)
Amount Column: 4 (fifth column)
Status Column: 5 (sixth column)
Invoice Pattern: INV-\d+
Amount Pattern: \$?([\d,]+\.?\d*)
```

## 🐛 Troubleshooting

### Wrong amount showing in modal?
- **Check Amount Column Index** - count carefully from 0
- Make sure you're counting only **visible** columns
- Hidden columns don't count!

### No buttons appearing?
- **Check Invoice ID Column Index** - make sure it's correct
- Check browser console for "Kathy:" logs
- Try "Reset to Defaults" and reconfigure

### Invoice ID not found?
- **Check Invoice ID Pattern** - does it match your format?
- Open console and look for pattern matching errors
- Test your regex pattern at regex101.com

## 💡 Pro Tips

1. **Use DevTools** - The Inspect tool is your friend for finding column indices
2. **Count Carefully** - Remember to start from 0, not 1!
3. **Visible Only** - Only count columns you can actually see
4. **Test Incrementally** - Change one setting at a time
5. **Check Console** - Look for "Kathy: Loaded custom configuration" log

## 🔄 Reset to Defaults

If something goes wrong:
1. Open extension options
2. Click **"🔄 Reset to Defaults"**
3. Click **"💾 Save Configuration"**
4. Reload extension and refresh page

## 📝 Notes

- Configuration is saved locally in your browser
- Changes take effect after reloading the extension
- Each browser profile can have different settings
- Settings sync across tabs but not across devices

---

**Need Help?** Check the browser console for "Kathy:" logs to see what's happening!


