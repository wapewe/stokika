# Admin Setup Instructions

## Step 1: Delete All Users (If Needed)
If you need to start fresh and delete all users including admin:

**IMPORTANT:** Run this SQL file in Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste contents of: `config/delete-all-users.sql`
3. Click "Run" to execute
4. This will safely delete all users by temporarily disabling RLS

## Step 2: Run Admin Policies SQL
1. Go to Supabase Dashboard → SQL Editor
2. Open and run: `config/admin-user-policies.sql`
3. This will:
   - Set up cascading deletes (when user deleted from auth, also deleted from users table)
   - Create admin-only policies for users table
   - Ensure only admin UUID `108e6bf0-c199-4374-a61e-0652b4901de2` can access users table

## Step 3: Create Admin User
1. Open: `html/setup-admin.html` in your browser
2. Click "Create Admin User" button
3. This will create admin with:
   - Email: stokikakenya@gmail.com
   - Password: @123456789Rb!
   - UUID: 108e6bf0-c199-4374-a61e-0652b4901de2

## Step 4: Login as Admin
1. Go to `html/admin-login.html`
2. Login with the admin credentials
3. You can now manage all users from the Users tab

## Important Notes

### User Deletion Sync
- When you delete a user from Supabase Dashboard → it will auto-delete from users table (via trigger)
- When you delete a user from Admin Panel → it deletes from users table (and attempts auth deletion)
- All related records (field_agents, supervisors, vendors, suppliers) are CASCADE deleted

### Users Table Access
- ONLY the admin user (UUID: 108e6bf0-c199-4374-a61e-0652b4901de2) can access the users table
- No other users can view, insert, update, or delete from users table
- This ensures maximum security

### Troubleshooting
If you get "User not allowed" error:
1. Make sure you ran `admin-user-policies.sql`
2. Verify you're logged in as the admin user
3. Check that RLS is enabled on users table

If deletion fails from Supabase Dashboard:
- This is a Supabase platform issue (500 error)
- Use the `config/delete-all-users.sql` script instead
- OR delete specific user with:
```sql
-- Temporarily disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users DISABLE ROW LEVEL SECURITY;

-- Delete the user
DELETE FROM users WHERE email = 'user@example.com';
DELETE FROM auth.users WHERE email = 'user@example.com';

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users ENABLE ROW LEVEL SECURITY;
```
