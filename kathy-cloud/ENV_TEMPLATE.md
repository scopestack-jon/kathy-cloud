# Environment Variables Configuration

Copy this to your `.env` file and fill in the values.

## Required Steps

### 1. Get Your Supabase Credentials

Go to your Supabase project dashboard:
- **Project URL & Keys**: https://supabase.com/dashboard/project/_/settings/api
- **Database URL**: https://supabase.com/dashboard/project/_/settings/database

### 2. Configure Local .env File

```bash
# ==================================================
# SUPABASE CONFIGURATION
# ==================================================

# Your Supabase Project URL (e.g., https://xxxxx.supabase.co)
NEXT_PUBLIC_SUPABASE_URL="your-project-url-here"

# Your Supabase Publishable/Anon Key (safe to expose to clients)
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_0I-Z5iMqRAQj59EcRgDTSQ_GIRTD6EV"

# Your Supabase Service Role Key (secret - NEVER expose to clients)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# ==================================================
# DATABASE CONFIGURATION
# ==================================================
# Format: postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DATABASE_URL="your-supabase-database-url-here"

# ==================================================
# RUNPAYMENTS CONFIGURATION
# ==================================================
RUNPAYMENTS_MODE="runpayments"
RUNPAYMENTS_API_URL="https://api.sandbox.runpayments-ab.io"
RUNPAYMENTS_API_KEY="EmDMkP80wVtkcCxnTjhHmkY7mZE0kVy8"
RUNPAYMENTS_MERCHANT_ID="gp_210769cae209a568cc4942116f5a7af7"
RUNPAYMENTS_WEBHOOK_SECRET="MiZkOuM5E0ERHFnZYQo8QzWtc1Xxl7lN"

# ==================================================
# API SECURITY
# ==================================================
API_SECRET_KEY="dev-secret-key-change-in-production"
SKIP_WEBHOOK_VERIFICATION="true"

# ==================================================
# APP CONFIGURATION
# ==================================================
NEXT_PUBLIC_APP_URL="https://kathy-cloud.vercel.app"
```

### 3. Add to Vercel

Run this command to add environment variables to Vercel:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add API_SECRET_KEY
vercel env add RUNPAYMENTS_API_KEY
vercel env add RUNPAYMENTS_MERCHANT_ID
vercel env add RUNPAYMENTS_WEBHOOK_SECRET
vercel env add NEXT_PUBLIC_APP_URL
```

Or add them via the Vercel dashboard:
https://vercel.com/jrlscott-7139s-projects/kathy-cloud/settings/environment-variables

## What You Need From Supabase Dashboard

1. **Project URL**: Found in Settings > API
2. **Anon Key**: ✅ You already have this
3. **Service Role Key**: Found in Settings > API (click "Reveal" button)
4. **Database URL**: Found in Settings > Database > Connection String > URI

## Next: Set Up Database

Once environment variables are configured, run:

```bash
cd /Users/jonscott/Desktop/kathyv3/kathy-cloud
npx prisma db push
```

This will create all the tables in your Supabase database.


