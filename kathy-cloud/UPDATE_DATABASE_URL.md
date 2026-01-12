# Update DATABASE_URL - Manual Steps

## The New Pooler URL:
```
postgresql://postgres.nszymjpphibhsjkwejgp:%26f49Dzm%26gOiq7z%253@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

## Step 1: Update Local .env
Open `kathy-cloud/.env` and replace the DATABASE_URL line with:
```
DATABASE_URL="postgresql://postgres.nszymjpphibhsjkwejgp:%26f49Dzm%26gOiq7z%253@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## Step 2: Update Vercel (Two Options)

### Option A: Via Web UI (Easiest)
1. Go to: https://vercel.com/jrlscott-7139s-projects/kathy-cloud/settings/environment-variables
2. Find DATABASE_URL
3. Click "Edit"
4. Paste the new value (without quotes):
   ```
   postgresql://postgres.nszymjpphibhsjkwejgp:%26f49Dzm%26gOiq7z%253@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
5. Save

### Option B: Via CLI
Run this command and paste the DATABASE_URL when prompted:
```bash
cd kathy-cloud
vercel env rm DATABASE_URL production --yes
cat /tmp/db_url_value.txt | vercel env add DATABASE_URL production
```

## Step 3: Redeploy
```bash
cd kathy-cloud
vercel --prod --yes
```

Let me know when you're done!
