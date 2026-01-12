# Update Your User Name

Run this SQL in Supabase SQL Editor:
https://supabase.com/dashboard/project/nszymjpphibhsjkwejgp/sql/new

```sql
UPDATE users 
SET first_name = 'Jon', last_name = 'Scott'
WHERE id = '9fb6d3a8-046f-4cbd-a679-812f0dcd7e95';

-- Verify the update
SELECT id, email, first_name, last_name FROM users WHERE id = '9fb6d3a8-046f-4cbd-a679-812f0dcd7e95';
```

After running this:
1. Reload the extension in chrome://extensions
2. Open the Kathy popup
3. You should see: "Welcome, Jon! 👋"
