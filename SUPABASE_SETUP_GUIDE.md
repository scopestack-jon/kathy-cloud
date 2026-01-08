# Supabase Setup Guide

Complete guide for setting up Supabase with Kathy Cloud for authentication and database hosting.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Enter project details:
   - **Name:** `kathy-cloud`
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan:** Start with Free tier
5. Click "Create new project"
6. Wait 2-3 minutes for provisioning

## Step 2: Get Connection Details

After project is created:

1. Go to **Settings** → **Database**
2. Copy these values:
   ```
   Host: db.[project-ref].supabase.co
   Database name: postgres
   Port: 5432
   User: postgres
   Password: [your password from step 1]
   ```

3. Construct `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 3: Run Database Migrations

1. Update `.env` file in `kathy-cloud/`:
   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

2. Run Prisma migrations:
   ```bash
   cd kathy-cloud
   npx prisma migrate deploy
   npx prisma generate
   ```

3. Run SQL migrations for multi-app schema:
   - Go to Supabase Dashboard → **SQL Editor**
   - Copy contents of `kathy-cloud/prisma/migrations/00_multiapp_schema.sql`
   - Paste and run

4. Run RLS policies:
   - Copy contents of `kathy-cloud/prisma/migrations/01_rls_policies.sql`
   - Paste and run in SQL Editor

## Step 4: Configure Google OAuth

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable "Google" provider
3. Configure Google OAuth:

### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google+ API"
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
5. Configure consent screen:
   - App name: `Kathy`
   - User support email: Your email
   - Authorized domains: `supabase.co`, `yourdomain.com`
   - Developer contact: Your email
6. Create OAuth client:
   - Application type: **Web application**
   - Name: `Kathy Auth`
   - Authorized redirect URIs:
     ```
     https://[project-ref].supabase.co/auth/v1/callback
     ```
7. Copy **Client ID** and **Client Secret**

### Add to Supabase

1. Back in Supabase → Authentication → Google provider
2. Paste **Client ID** and **Client Secret**
3. Click **Save**

## Step 5: Get Supabase API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL:** `https://[project-ref].supabase.co`
   - **anon public key:** `eyJxxx...` (public, safe for client)
   - **service_role key:** `eyJxxx...` (secret, never expose!)

## Step 6: Update Environment Variables

### Backend (kathy-cloud/.env)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...service-role-key...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Existing
RUNPAYMENTS_API_URL=https://api.sandbox.runpayments-ab.io
RUNPAYMENTS_API_KEY=your-api-key
API_SECRET_KEY=your-secret-key
NEXT_PUBLIC_APP_URL=https://getkathy.io
```

### Extension (.env.local or build config)

```bash
PLASMO_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
PLASMO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...anon-key...
PLASMO_PUBLIC_API_URL=https://your-vercel-app.vercel.app
```

## Step 7: Test Database Connection

```bash
cd kathy-cloud
npx prisma studio
```

You should see:
- organizations table
- users table
- application_configs table
- payment_sessions table (updated schema)
- audit_logs table (updated schema)

## Step 8: Verify RLS Policies

1. Go to Supabase Dashboard → **Database** → **Policies**
2. Confirm policies exist for:
   - `organizations` (2 policies)
   - `users` (4 policies)
   - `application_configs` (2 policies)
   - `payment_sessions` (3 policies)
   - `audit_logs` (2 policies)

## Step 9: Create Test Organization

Run in Supabase SQL Editor:

```sql
-- Create test organization
INSERT INTO organizations (id, name, slug, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Organization',
  'test-org',
  NOW()
);

-- Create test user (after signing up with Google)
-- Replace 'your-google-auth-id' with actual auth.users.id from Supabase Auth
INSERT INTO users (id, organization_id, email, role, created_at)
VALUES (
  'your-google-auth-id',
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  'admin',
  NOW()
);
```

## Step 10: Test Authentication

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. You should see no users initially
3. Test sign-up flow:
   - Use Supabase Auth UI or your custom flow
   - Sign up with Google
   - Verify user appears in Authentication dashboard
   - Verify user row created in `users` table

## Troubleshooting

### Can't connect to database
- Check DATABASE_URL format
- Verify password is correct
- Check firewall/network settings
- Confirm Supabase project is active

### OAuth not working
- Verify Google OAuth credentials
- Check authorized redirect URIs
- Confirm consent screen is published
- Test in incognito mode

### RLS policies not working
- Run `01_rls_policies.sql` again
- Check policies in dashboard
- Test with authenticated user
- Verify auth.uid() returns correct ID

### Migrations failing
- Check Prisma schema syntax
- Verify DATABASE_URL is correct
- Run `npx prisma generate` first
- Check Supabase logs

## Next Steps

After Supabase setup is complete:
1. ✅ Migrate auth.ts to use Supabase JWT
2. ✅ Update extension to use Supabase Auth
3. ✅ Implement trial mode
4. ✅ Deploy to Vercel

## Security Checklist

- [ ] Service role key is never exposed to client
- [ ] RLS is enabled on all tables
- [ ] Google OAuth credentials are secure
- [ ] Database password is strong and stored securely
- [ ] anon key is used for client-side operations only
- [ ] CORS is properly configured
- [ ] Auth tokens have appropriate expiration

---

**Support:** If you encounter issues, check Supabase docs at https://supabase.com/docs

