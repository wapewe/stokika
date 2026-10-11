# Fix Users Display Issue - Quick Guide

## Problem
- Users tab shows only 1 user (last created) instead of all 5+ users
- Vendors/Suppliers/Field Agents/Supervisors tabs show "No data found"
- Admin can't see users created through the Create User modal

## Root Cause
RLS (Row Level Security) policies are blocking queries. The policies only allow the admin user (UUID: 108e6bf0-c199-4374-a61e-0652b4901de2) to access data, but the queries might not be properly authenticated.

## Solution

### Step 1: Run the RLS Fix SQL
1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `C:\Users\ADMIN\Videos\stokika\config\fix-rls-policies.sql`
3. Copy all the SQL code
4. Paste into SQL Editor
5. Click "Run"

This will:
- Fix RLS policies for vendors, suppliers, field_agents, and supervisors tables
- Allow admin (UUID: 108e6bf0-c199-4374-a61e-0652b4901de2) to view ALL records
- Keep public insert policies for recruitment forms

### Step 2: Verify the Fix
1. Refresh your admin dashboard
2. Go to Users tab → Should show all 5+ users
3. Go to Vendors tab → Should show all vendors (including those created by admin)
4. Go to Suppliers tab → Should show all suppliers
5. Go to Field Agents tab → Should show all field agents
6. Go to Supervisors tab → Should show all supervisors

### Step 3: Check Database Directly (Optional)
If still having issues, check Supabase directly:
1. Go to Supabase Dashboard → Table Editor
2. Click on "users" table → Should see all 5+ users
3. Click on "vendors" table → Should see all vendors
4. Check if user_id column is populated for users created by admin

## What Changed in Code
- Removed `.not('user_id', 'is', null)` filter from all load functions
- Now shows ALL records in each table (not just those with user_id)
- Removed pagination from Users tab for simplicity

## Expected Behavior After Fix
- **Users Tab**: Shows ALL users from public.users table
- **Vendors Tab**: Shows ALL vendors (both from recruitment forms AND admin-created)
- **Suppliers Tab**: Shows ALL suppliers (both from recruitment forms AND admin-created)
- **Field Agents Tab**: Shows ALL field agents (both from recruitment forms AND admin-created)
- **Supervisors Tab**: Shows ALL supervisors (both from recruitment forms AND admin-created)

## If Still Not Working
Check browser console (F12) for errors:
- Look for "permission denied" or "RLS policy" errors
- Check if Supabase client is properly initialized
- Verify you're logged in as admin (UUID: 108e6bf0-c199-4374-a61e-0652b4901de2)
- Try logging out and logging back in

## Admin Credentials
- Email: stokikakenya@gmail.com
- Password: @123456789Rb!
- UUID: 108e6bf0-c199-4374-a61e-0652b4901de2
