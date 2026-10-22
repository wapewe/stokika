# Edge Function Database Schema Fix

## Issue
Edge Function was using old/incorrect column names:
- ❌ `company_name` → ✅ `business_name`
- ❌ `phone` → ✅ `contact_phone`
- ❌ `email` → ✅ `contact_email`

## Fix Applied
Updated `index.ts` to use correct column names matching the actual database schema from `20260914160003_create_business_entities_tables.sql`

## Deploy Command
```bash
supabase functions deploy supplier-registration-submit --no-verify-jwt
```

## Date
October 20, 2026
