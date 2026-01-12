# Quick Guide: Get Pooler Connection String

## 3 Steps:

1. **Open Supabase Dashboard**: 
   https://supabase.com/dashboard/project/nszymjpphibhsjkwejgp/settings/database

2. **Find "Connection string" section**
   - Look for a dropdown that says "Connection string"
   - Change it from "Direct connection" to **"Session pooler"**

3. **Copy the connection string**
   - It will look like: `postgresql://postgres.nszymjpphibhsjkwejgp:[YOUR-PASSWORD]@...pooler.supabase.com:6543/postgres`
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - **Send me the FULL string** (I'll handle URL encoding)

## Your Database Password:

Based on your current .env, your password is: `&f49Dzm&gOiq7z%3`
(The URL-encoded version was: `%26f49Dzm%26gOiq7z%253`)

## Once You Give Me the String:

I'll use Vercel CLI to:
```bash
vercel env add DATABASE_URL production
vercel --prod --yes
```

Ready! Just paste the pooler connection string here.
