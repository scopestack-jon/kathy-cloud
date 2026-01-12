# Apply User Names Migration

## Step 1: Run Migration in Supabase

Go to: https://supabase.com/dashboard/project/nszymjpphibhsjkwejgp/sql/new

Paste and run:
```sql
-- Add firstName and lastName columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
```

## Step 2: Generate Prisma Client
```bash
cd kathy-cloud
npx prisma generate
```

## Step 3: Deploy
```bash
vercel --prod --yes
```

Let me know when you've run the SQL migration in Supabase!
