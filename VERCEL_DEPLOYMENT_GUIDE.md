# Vercel Deployment Guide

Complete guide for deploying Kathy Cloud to Vercel with all multi-app features.

## Prerequisites

- ✅ Supabase project created and configured
- ✅ Google OAuth credentials obtained
- ✅ RunPayments API key
- ✅ Database schema migrated
- ✅ RLS policies applied

## Step 1: Prepare Repository

1. Ensure all code is committed to git:
   ```bash
   cd /Users/jonscott/Desktop/kathyv3
   git add .
   git commit -m "feat: Multi-app deployment ready"
   git push origin main
   ```

2. Verify required files exist:
   - `kathy-cloud/package.json`
   - `kathy-cloud/prisma/schema.prisma`
   - All API routes and dashboard pages

## Step 2: Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

## Step 3: Configure Vercel Project

1. Navigate to project:
   ```bash
   cd /Users/jonscott/Desktop/kathyv3/kathy-cloud
   ```

2. Link to Vercel:
   ```bash
   vercel link
   ```

3. Follow prompts:
   - Set up and deploy: **Yes**
   - Which scope: Your Vercel account
   - Link to existing project: **No** (create new)
   - Project name: `kathy-cloud`
   - Which directory: `.` (current directory)

## Step 4: Configure Environment Variables

Add environment variables in Vercel dashboard or via CLI:

```bash
# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://[project-ref].supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: eyJxxx...anon-key...

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter: eyJxxx...service-role-key...

vercel env add DATABASE_URL production
# Enter: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# RunPayments
vercel env add RUNPAYMENTS_API_URL production
# Enter: https://api.sandbox.runpayments-ab.io

vercel env add RUNPAYMENTS_API_KEY production
# Enter: your-runpayments-api-key

# App Configuration
vercel env add API_SECRET_KEY production
# Enter: generate-a-strong-random-key

vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://kathy-cloud.vercel.app (or your custom domain)
```

## Step 5: Configure Build Settings

Create or update `vercel.json` in `kathy-cloud/`:

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
    }
  }
}
```

## Step 6: Deploy to Production

```bash
vercel --prod
```

This will:
1. Build the Next.js application
2. Generate Prisma client
3. Deploy to Vercel's edge network
4. Provide production URL

## Step 7: Configure Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add custom domain: `getkathy.io`
3. Configure DNS:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → Vercel IP addresses

4. Update environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_APP_URL production
   # Enter: https://getkathy.io
   ```

## Step 8: Configure Webhooks

Update RunPayments webhook URL to point to Vercel:

```
https://kathy-cloud.vercel.app/api/webhooks/payment
```

Or with custom domain:

```
https://getkathy.io/api/webhooks/payment
```

## Step 9: Test Deployment

1. Visit your Vercel URL
2. Test landing page: `https://[your-url].vercel.app`
3. Test dashboard: `https://[your-url].vercel.app/dashboard`
4. Test API: 
   ```bash
   curl https://[your-url].vercel.app/api/applications \
     -H "Authorization: Bearer your-test-token"
   ```

## Step 10: Enable Vercel Features

### A. Analytics
- Go to Project Settings → Analytics
- Enable Web Analytics
- Enable Audience insights

### B. Edge Config (Optional)
For feature flags and dynamic configuration:
```bash
vercel env add EDGE_CONFIG production
```

### C. Cron Jobs (Optional)
Create `vercel.json` cron configuration:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-payments",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Step 11: Set Up CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

Add `VERCEL_TOKEN` to GitHub repository secrets.

## Step 12: Configure CORS

Update `kathy-cloud/middleware.ts` for production:

```typescript
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'chrome-extension://*', // Chrome extensions
      process.env.NEXT_PUBLIC_APP_URL,
      'https://getkathy.io',
      'https://www.getkathy.io'
    ]

    const response = NextResponse.next()
    
    if (origin && allowedOrigins.some(allowed => 
      origin.match(new RegExp(allowed.replace('*', '.*')))
    )) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  }

  return NextResponse.next()
}
```

## Step 13: Monitor Deployment

### Check Logs
```bash
vercel logs [deployment-url]
```

### View in Dashboard
1. Go to Vercel Dashboard
2. Select your project
3. Click on deployment
4. View real-time logs and metrics

### Set Up Alerts
1. Project Settings → Integrations
2. Add Slack/Discord for deployment notifications
3. Configure error alerts

## Troubleshooting

### Build Fails
- Check Prisma schema syntax
- Verify DATABASE_URL is correct
- Ensure all dependencies in package.json
- Check Node.js version compatibility

### Database Connection Issues
- Verify Supabase connection string
- Check IP whitelist (should allow all for Vercel)
- Test connection locally first
- Review Prisma generate step

### Environment Variables Not Working
- Redeploy after adding/changing env vars
- Check spelling and format
- Verify secrets are in correct environment (production/preview/development)
- Use `vercel env ls` to list all variables

### API Routes 404
- Check route file names and structure
- Verify exports (GET, POST, etc.)
- Review Vercel function logs
- Check middleware configuration

### CORS Errors
- Update middleware.ts with correct origins
- Check browser extension manifest
- Verify OPTIONS handling
- Test with curl first

## Performance Optimization

### 1. Enable ISR (Incremental Static Regeneration)
```typescript
export const revalidate = 60 // Revalidate every 60 seconds
```

### 2. Use Edge Functions for API Routes
```typescript
export const config = {
  runtime: 'edge',
}
```

### 3. Optimize Images
Use Next.js Image component:
```typescript
import Image from 'next/image'
```

### 4. Enable Compression
Vercel automatically compresses responses.

## Security Checklist

- [ ] All secrets stored in Vercel environment variables
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] RLS enabled on Supabase
- [ ] Service role key never exposed to client
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] CSP headers configured
- [ ] API routes protected with authentication

## Post-Deployment

1. Update extension's API_URL to point to Vercel
2. Test all features end-to-end
3. Monitor error rates in Vercel Analytics
4. Set up uptime monitoring (e.g., UptimeRobot)
5. Configure backup strategy for database

## Rollback Procedure

If deployment has issues:

```bash
# List recent deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

Or in Vercel Dashboard:
1. Go to Deployments
2. Find working deployment
3. Click "Promote to Production"

## Cost Management

Vercel pricing:
- **Hobby (Free)**: Good for testing
- **Pro ($20/mo)**: Recommended for production
  - Unlimited bandwidth
  - Advanced analytics
  - Team collaboration

Monitor usage:
- Dashboard → Usage
- Set spending limits
- Optimize function execution time

## Next Steps

- ✅ Deploy to Vercel
- ✅ Configure custom domain
- ✅ Set up monitoring
- ✅ Update extension configuration
- ✅ Test webhooks
- ✅ Monitor for 24 hours
- ✅ Announce to users

---

**Support:** For Vercel-specific issues, check https://vercel.com/docs


