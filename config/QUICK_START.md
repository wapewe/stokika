# Quick Start - Admin Setup

## 🚀 3-Step Setup Process

### Step 1: Delete All Users
Run in Supabase SQL Editor:
```
config/delete-all-users.sql
```

### Step 2: Setup Policies
Run in Supabase SQL Editor:
```
config/admin-user-policies.sql
```

### Step 3: Create Admin
Open in browser:
```
html/setup-admin.html
```
Click "Create Admin User"

---

## ✅ Done!
Login at: `html/admin-login.html`
- Email: stokikakenya@gmail.com
- Password: @123456789Rb!

---

## 🔧 If You Get Errors

### Error: "policy already exists"
✅ Fixed! The updated `admin-user-policies.sql` now drops existing policies first.

### Error: "violates foreign key constraint admin_users_user_id_fkey"
✅ Fixed! Use `delete-all-users.sql` which handles all foreign keys properly.

### Error: "User not allowed"
- Make sure you ran `admin-user-policies.sql`
- Verify you're logged in as admin (stokikakenya@gmail.com)

---

## 📁 Files Created
- `config/admin-user-policies.sql` - Sets up admin access & cascading deletes
- `config/delete-all-users.sql` - Safely deletes all users
- `config/ADMIN_SETUP_INSTRUCTIONS.md` - Detailed instructions
- `config/QUICK_START.md` - This file
