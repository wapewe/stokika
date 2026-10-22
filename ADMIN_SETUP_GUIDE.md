# Admin Setup Guide

This guide explains how to create the first admin user in your Supabase database.

## Prerequisites

- Supabase project set up and running
- Local development environment configured
- Supabase CLI installed (optional, for running migrations locally)

## Database Structure

The system uses the following tables for authentication:
- `auth.users` - Supabase Auth table (managed automatically)
- `user_roles` - Defines available roles (admin, vendor, supplier, etc.)
- `profiles` - User profile data linked to auth.users with role assignment

## Setup Process

### Step 1: Apply the Admin Setup Migration

This migration creates temporary policies and a helper function to allow the first admin user to be created.

**Option A: Using Supabase CLI (Local Development)**
```bash
cd c:\Users\ADMIN\Music\stokika
supabase migration up
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open and run the migration file:
   `supabase/migrations/20261020130000_create_admin_setup_function.sql`

### Step 2: Create the Admin User

**Option A: Using the Web Interface (Recommended)**

1. Start your local development server:
   ```powershell
   # In your project directory
   # Example: php -S localhost:8000
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000/setup-admin.html
   ```

3. Click the "Create Admin User" button

4. The default credentials are:
   - **Email**: krieta8@gmail.com
   - **Password**: @123456789Rb!
   - **Phone**: 254700000000 (placeholder)

**Option B: Using Supabase Dashboard**

1. Go to Authentication > Users
2. Click "Add User"
3. Create user with:
   - Email: krieta8@gmail.com
   - Password: @123456789Rb!
   - Auto Confirm User: Yes

4. Copy the User ID (UUID)

5. Go to SQL Editor and run:
```sql
SELECT insert_admin_profile(
    '<USER_ID>'::uuid,
    'krieta8@gmail.com',
    'System Administrator',
    '254700000000'
);
```

Replace `<USER_ID>` with the actual UUID from step 4.

### Step 3: Verify Admin Creation

1. Go to Table Editor > profiles
2. Look for the user with email `krieta8@gmail.com`
3. Verify that:
   - The `role_id` matches the 'admin' role from `user_roles` table
   - `is_active` is `true`
   - `email_verified` is `true`

### Step 4: Clean Up Temporary Policies

After successfully creating the admin user, apply the cleanup migration to remove temporary permissions:

**Option A: Using Supabase CLI**
```bash
# The cleanup migration will run automatically with the next migration up
supabase migration up
```

**Option B: Using Supabase Dashboard**
1. Go to SQL Editor
2. Run the cleanup migration:
   `supabase/migrations/20261020130001_cleanup_admin_setup.sql`

## What Each Migration Does

### Migration 1: `20261020130000_create_admin_setup_function.sql`

Creates:
- Temporary RLS policies that allow anonymous users to create the first admin
- `setup_first_admin()` - Helper function to check if admin can be created
- `insert_admin_profile()` - Function to insert admin profile safely

### Migration 2: `20261020130001_cleanup_admin_setup.sql`

Removes:
- Temporary RLS policies (security hardening)
- `setup_first_admin()` function (no longer needed)
- Anonymous access to `insert_admin_profile()`

Creates:
- Proper RLS policies for admin and user access
- Restricted access to profile management

## Login After Setup

1. Navigate to the admin login page:
   ```
   http://localhost:8000/rembrandts-donji.html
   ```

2. Log in with:
   - Email: krieta8@gmail.com
   - Password: @123456789Rb!

## Troubleshooting

### Error: "Admin user already exists"
- The admin has already been created
- You can log in directly at `rembrandts-donji.html`

### Error: "Could not find the table 'public.users'"
- This is expected - the system uses `profiles` table, not `users`
- Make sure you're using the updated `setup-admin.js` file

### Error: "Failed to create admin record"
- Run the admin setup migration first (Step 1)
- Check that `user_roles` table has an 'admin' role entry

### Error: "PGRST" errors
- Database migration not applied
- Run `supabase migration up` or apply via dashboard

### Supabase config not loading
- Ensure `/config.json` exists with your Supabase project URL:
  ```json
  {
    "supabaseUrl": "https://your-project.supabase.co"
  }
  ```
- Ensure the `get-config` Edge Function is deployed

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change the default password immediately** after first login
2. **Run the cleanup migration** after admin creation to remove temporary policies
3. **Do not leave temporary policies active** in production
4. **Protect the admin credentials** - store them securely
5. **Enable MFA** on the admin account through Supabase dashboard

## File References

- Setup Page: `setup-admin.html`
- Setup Script: `js/auth/setup-admin.js`
- Admin Login: `rembrandts-donji.html`
- Auth Guard: `js/auth/rembrandts-auth-guard.js`
- Migration 1: `supabase/migrations/20261020130000_create_admin_setup_function.sql`
- Migration 2: `supabase/migrations/20261020130001_cleanup_admin_setup.sql`

## Next Steps

After successful admin setup:

1. ✅ Log in to the admin dashboard
2. ✅ Change the default password
3. ✅ Set up additional admin users if needed
4. ✅ Configure role-based access for other user types
5. ✅ Review and customize RLS policies as needed
