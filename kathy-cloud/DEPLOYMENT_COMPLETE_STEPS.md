# Final Deployment Steps

## ✅ Completed
- Vercel deployment successful: https://kathy-cloud.vercel.app
- Supabase project created and healthy
- SQL migration scripts generated
- Local .env configured with Supabase credentials

## 🔄 In Progress: Database Setup

### Step 1: Create Database Tables
1. Go to: https://supabase.com/dashboard/project/nszymjpphibhsjkwejgp/sql/new
2. Copy and paste the SQL from `/kathy-cloud/setup_database.sql` (shown above)
3. Click "Run" to create all tables

### Step 2: Apply Row Level Security  
1. After Step 1 completes
2. Copy and paste SQL from `/kathy-cloud/prisma/migrations/01_rls_policies.sql`
3. Click "Run" to enable RLS policies

## 📋 Next: Configure Vercel Environment Variables

After database setup completes, run these commands to add environment variables to Vercel:

```bash
cd /Users/jonscott/Desktop/kathyv3/kathy-cloud

# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://nszymjpphibhsjkwejgp.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: sb_publishable_0I-Z5iMqRAQj59EcRgDTSQ_GIRTD6EV

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter: sb_secret_Jm6QTBPSTi-AAvrX6O0byA_nI-l14ar

vercel env add DATABASE_URL production
# Enter: postgresql://postgres:%26f49Dzm%26gOiq7z%253@db.nszymjpphibhsjkwejgp.supabase.co:5432/postgres?sslmode=require

# API & RunPayments
vercel env add API_SECRET_KEY production
# Enter: dev-secret-key-change-in-production

vercel env add RUNPAYMENTS_API_KEY production
# Enter: EmDMkP80wVtkcCxnTjhHmkY7mZE0kVy8

vercel env add RUNPAYMENTS_MERCHANT_ID production
# Enter: gp_210769cae209a568cc4942116f5a7af7

vercel env add RUNPAYMENTS_WEBHOOK_SECRET production
# Enter: MiZkOuM5E0ERHFnZYQo8QzWtc1Xxl7lN

vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://kathy-cloud.vercel.app
```

## 🚀 Final: Redeploy with Environment Variables

After adding all environment variables:

```bash
vercel --prod
```

## 🔐 Enable Google OAuth

1. Go to: https://supabase.com/dashboard/project/nszymjpphibhsjkwejgp/auth/providers
2. Enable **Google** provider
3. Add these redirect URLs:
   - `https://kathy-cloud.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

## 📝 Update RunPayments Webhook

Update your RunPayments webhook URL to:
```
https://kathy-cloud.vercel.app/api/webhooks/payment
```

## ✨ What You'll Have

- ✅ Multi-tenant payment tracking system
- ✅ Supabase authentication with Google OAuth
- ✅ Row Level Security for data isolation
- ✅ Multi-application support (Practice Panther + others)
- ✅ Payment session tracking and webhooks
- ✅ Admin dashboard at https://kathy-cloud.vercel.app/dashboard
- ✅ Chrome extension backend API ready

## 🧪 Test Your Setup

1. Visit: https://kathy-cloud.vercel.app
2. Sign up with Google
3. Create your first organization
4. Configure an application in the dashboard
5. Test a payment collection from Practice Panther


