# Update Extension Icon Instructions

## Current Status

I've created a new icon design that matches the Kathy badge:
- **Green circle** background (#48AF50 - Kathy brand green)
- **White "K"** letter in the center
- SVG file created at: `assets/icon.svg`

## To Generate PNG Icons

Since image conversion tools aren't available, you have two options:

### Option 1: Use Online SVG to PNG Converter (Easiest)

1. **Open the SVG file**: `assets/icon.svg`
2. **Go to**: https://cloudconvert.com/svg-to-png
3. **Upload** `icon.svg`
4. **Convert at these sizes** (create 5 separate files):
   - 16x16 → Save as `assets/icon16.png`
   - 32x32 → Save as `assets/icon32.png`
   - 48x48 → Save as `assets/icon48.png`
   - 64x64 → Save as `assets/icon64.png`
   - 128x128 → Save as `assets/icon128.png`

### Option 2: Use Browser (Quick Method)

1. **Open**: `/tmp/create_icon.html` in Chrome
2. **Open DevTools** (F12)
3. **Check Console** - you'll see a base64 image string
4. **Copy the base64 string** (starts with `data:image/png;base64,`)
5. **Use online tool** to convert base64 to PNG:
   - Go to: https://base64.guru/converter/decode/image
   - Paste the base64 string
   - Download as PNG
6. **Resize** to different sizes using:
   - https://www.iloveimg.com/resize-image

### Option 3: Install ImageMagick (One-time setup)

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install ImageMagick
brew install imagemagick

# Then convert the SVG
cd /Users/jonscott/Desktop/kathyv3/assets
magick icon.svg -resize 16x16 icon16.png
magick icon.svg -resize 32x32 icon32.png
magick icon.svg -resize 48x48 icon48.png
magick icon.svg -resize 64x64 icon64.png
magick icon.svg -resize 128x128 icon128.png
```

## After Creating PNG Files

Once you have the PNG files at different sizes:

### 1. Place them in assets folder:
```
assets/
  ├── icon16.png
  ├── icon32.png
  ├── icon48.png
  ├── icon64.png
  └── icon128.png
```

### 2. Update package.json:

Add this section:
```json
"manifest": {
  "icons": {
    "16": "assets/icon16.png",
    "32": "assets/icon32.png",
    "48": "assets/icon48.png",
    "64": "assets/icon64.png",
    "128": "assets/icon128.png"
  }
}
```

### 3. Rebuild the extension:
```bash
cd /Users/jonscott/Desktop/kathyv3
npm run build
```

### 4. Reload in Chrome:
- Go to `chrome://extensions/`
- Find Kathy
- Click refresh icon
- The icon should now be green with white K!

## Current Icon Design

```
   ╭─────────╮
   │  ╭───╮  │
   │ │ K │  │  ← White K
   │  ╰───╯  │
   ╰─────────╯
   Green circle
```

**Colors:**
- Background: #48AF50 (Kathy green)
- Text: #FFFFFF (White)

This matches the badge in the UI exactly!

## Quick Test

After rebuilding, check:
- Extension icon in toolbar → Should be green with white K
- Extension icon in chrome://extensions/ → Should be green with white K
- Matches the K badge in Practice Panther UI → ✓

---

**Note:** The SVG is ready to use. You just need to convert it to PNG files at the specified sizes using one of the methods above!




