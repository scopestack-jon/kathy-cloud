# Fix Vercel Deployment Error

## Error
```
Error: No Next.js version detected. Make sure your package.json has "next"
in either "dependencies" or "devDependencies".
```

## Root Cause
Vercel is trying to build from the root directory (`/kathyv3/`) but Next.js is in the subdirectory (`/kathyv3/kathy-cloud/`).

## Solution: Configure Root Directory in Vercel

### Step 1: Go to Vercel Project Settings
1. Visit: https://vercel.com/jrlscott-7139s-projects/kathy-cloud/settings
2. Or: Vercel Dashboard → Select "kathy-cloud" project → Settings

### Step 2: Update Root Directory
1. In the left sidebar, click **"General"**
2. Scroll down to **"Root Directory"** section
3. Click **"Edit"**
4. Enter: `kathy-cloud`
5. Click **"Save"**

### Step 3: Redeploy
1. Go to Deployments tab
2. Find the failed deployment
3. Click the three dots (···) → **"Redeploy"**
4. Or trigger a new deployment:
   ```bash
   git commit --allow-empty -m "Trigger Vercel rebuild"
   git push origin main
   ```

## Alternative: Quick Fix via Vercel CLI

If you have Vercel CLI installed:

```bash
cd /Users/jonscott/Desktop/kathyv3/kathy-cloud

# Link to your project (if not already linked)
vercel link

# Deploy directly from kathy-cloud directory
vercel --prod
```

## Verify Configuration

After setting Root Directory to `kathy-cloud`, Vercel should:
- ✅ Find `package.json` with Next.js
- ✅ Run `npm install` in `kathy-cloud/`
- ✅ Run `prisma generate && next build`
- ✅ Deploy successfully

## Expected Build Output

```
✓ Generated Prisma Client
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Collecting page data
✓ Generating static pages (21/21)
✓ Finalizing page optimization

Route (app)
├ ○ /
├ ○ /dashboard
├ ○ /dashboard/smartmoving
├ ƒ /api/payment-sessions/from-smartmoving
└ ... (all other routes)
```

## Environment Variables

Make sure these are set in Vercel (Project Settings → Environment Variables):

### Required
- `DATABASE_URL` - Supabase connection string
- `DIRECT_URL` - Supabase direct connection (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### RunPayments
- `RUNPAYMENTS_MODE` - `runpayments` or `stripe` or `mock`
- `RUNPAYMENTS_API_KEY` - RunPayments API key
- `RUNPAYMENTS_CC_MID` - Credit card merchant ID
- `RUNPAYMENTS_REFRESH_TOKEN` - API refresh token
- `RUNPAYMENTS_WEBHOOK_SECRET` - Webhook signature secret

### Optional
- `NODE_ENV` - `production`
- `NEXT_PUBLIC_API_URL` - Your Vercel deployment URL

## Troubleshooting

### Still getting the error?

**Check Current Settings:**
1. Vercel Dashboard → kathy-cloud → Settings → General
2. Verify **Root Directory** is set to `kathy-cloud`
3. Verify **Build Command** is blank (uses package.json script)
4. Verify **Output Directory** is blank (Next.js default: `.next`)

**Check package.json:**
```bash
# Should show Next.js in dependencies
cat kathy-cloud/package.json | grep "next"
```

Expected output:
```json
"next": "^16.1.1"
```

### Build succeeds but site doesn't work?

**Check Environment Variables:**
1. Vercel Dashboard → kathy-cloud → Settings → Environment Variables
2. Verify all required variables are set
3. Especially check `DATABASE_URL` and Supabase keys

**Check Build Logs:**
1. Deployments tab → Click latest deployment
2. Click "Building" step → View full logs
3. Look for errors during `prisma generate` or `next build`

### Database Connection Issues?

If you see Prisma errors:
1. Check `DATABASE_URL` is the **pooled** connection string
2. Format: `postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1`
3. Check `DIRECT_URL` is the **direct** connection string (for migrations)
4. Format: `postgresql://user:pass@host:5432/db`

## Success Indicators

After successful deployment:

✅ **Build Logs:**
```
✓ Generated Prisma Client
✓ Compiled successfully
✓ Creating optimized build
✓ Route (app) shows all routes including /dashboard/smartmoving
```

✅ **Deployment:**
- Status: Ready
- Domain: https://kathy-cloud.vercel.app (or your custom domain)

✅ **Health Check:**
```bash
# Test the API
curl https://kathy-cloud.vercel.app/api/auth/me
# Should return JSON (may require auth)
```

✅ **Dashboard Access:**
- Visit: https://kathy-cloud.vercel.app/dashboard
- Should show login page or dashboard (if logged in)
- SmartMoving button should be visible

## Next Steps After Successful Deployment

1. **Reload Chrome Extension:**
   - `chrome://extensions/` → Find Kathy → Click reload 🔄

2. **Test SmartMoving Configuration:**
   - Go to `/dashboard/smartmoving`
   - Enter SmartMoving API credentials
   - Save configuration

3. **Follow Testing Guide:**
   - See `TESTING_SMARTMOVING.md` for complete testing workflow

## Quick Verification Script

```bash
# 1. Check root directory is set correctly
echo "Check Vercel dashboard: Root Directory should be 'kathy-cloud'"

# 2. Verify package.json has Next.js
cat kathy-cloud/package.json | grep next

# 3. Test local build (should work)
cd kathy-cloud
npm install
npm run build

# 4. If local build works but Vercel fails, it's a configuration issue
```

## Contact Support

If you're still having issues:
1. Copy the full build log from Vercel
2. Share the error message
3. Verify Root Directory setting in Vercel dashboard
