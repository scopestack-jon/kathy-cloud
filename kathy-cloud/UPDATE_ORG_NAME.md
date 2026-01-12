# Update Organization Name to "J&J Ventures"

Run this SQL in Supabase SQL Editor:
https://supabase.com/dashboard/project/nszymjpphibhsjkwejgp/sql/new

```sql
UPDATE organizations 
SET name = 'J&J Ventures'
WHERE id = '05d79b86-5765-4bb4-9658-8b1f981b351f';

-- Verify the update
SELECT id, name, slug FROM organizations WHERE id = '05d79b86-5765-4bb4-9658-8b1f981b351f';
```

After running this:
1. Reload the extension in chrome://extensions
2. Open the Kathy popup (it will fetch fresh data)
3. Organization should now show "J&J Ventures" everywhere
