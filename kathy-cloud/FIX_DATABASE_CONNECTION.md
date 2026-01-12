# Fix Database Connection for Vercel

## The Problem:
Your DATABASE_URL uses direct connection (port 5432), but Vercel serverless needs a connection pooler.

## Solution: Get the Pooler Connection String

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/nszymjpphibhsjkwejgp
2. **Click "Settings" (gear icon)** in the left sidebar
3. **Click "Database"**
4. **Scroll down to "Connection string"**
5. **Select "Session pooler" or "Transaction pooler"** (dropdown)
6. **Copy the connection string** (it should include port 6543, not 5432)
7. **Replace the password placeholder** with your actual database password

The pooler URL should look like:
```
postgresql://postgres.nszymjpphibhsjkwejgp:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Update the DATABASE_URL:

Once you have the pooler connection string, we'll update:
1. `.env` file (local)
2. Vercel environment variables (production)

Tell me when you have the pooler connection string!
