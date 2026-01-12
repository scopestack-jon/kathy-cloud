-- Check user setup for jon+demo@agently.bot
SELECT 
  u.id as user_id,
  u.email,
  u.organization_id,
  u.role,
  o.name as org_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email LIKE 'jon%@agently.bot'
ORDER BY u.created_at DESC;
