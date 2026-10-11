# CRITICAL FIX - Update Admin UUID

## Problem
All RLS policies were using the OLD deleted admin UUID: `108e6bf0-c199-4374-a61e-0652b4901de2`

The CURRENT admin UUID is: `3f6a23fc-5a40-480c-a98f-839861b3bd98`

This is why:
- Users tab shows only 1 user
- Vendors tab shows "No vendors found"
- All tabs can't see data properly

## Solution - Run This SQL Script

**File:** `C:\Users\ADMIN\Videos\stokika\config\update-admin-uuid.sql`

### Steps:
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire content of `update-admin-uuid.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Refresh your admin dashboard
6. All data should now be visible

## What This Does
Updates ALL RLS policies across ALL tables to use the correct admin UUID:
- users table
- vendors table
- suppliers table
- field_agents table
- supervisors table
- contacts table
- orders table
- payments table

## Current Admin Details
- **Email:** stokikakenya@gmail.com
- **Password:** @123456789Rb!
- **UUID:** 3f6a23fc-5a40-480c-a98f-839861b3bd98

## After Running the Script
All admin dashboard tabs will work correctly:
✅ Users tab - Shows all users
✅ Vendors tab - Shows all vendors
✅ Suppliers tab - Shows all suppliers
✅ Field Agents tab - Shows all field agents
✅ Supervisors tab - Shows all supervisors
✅ Contacts tab - Shows all contacts
✅ Orders tab - Shows all orders
✅ Payments tab - Shows all payments

## Important Note
Every time you create a NEW admin user, you MUST update all RLS policies with the new UUID.
