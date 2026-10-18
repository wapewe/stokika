#!/bin/bash

# Test M-Pesa STK Push Edge Function
# This script sends a test payment request to verify the function is working

# IMPORTANT: Replace these values with actual test data
SUPABASE_URL="https://eidsqrnwfndruuufyacc.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY_HERE"  # Get from Supabase Dashboard

# Test payload with valid structure
curl -L -X POST "${SUPABASE_URL}/functions/v1/mpesa-stk-push" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "phoneNumber": "254712345678",
    "amount": 1050,
    "userType": "vendor",
    "applicationCode": "TEST123",
    "accountReference": "12345678",
    "transactionDesc": "Test Payment",
    "flowType": "vendor_registration"
  }' \
  -v

# Expected responses:
# Success (200): { "success": true, "checkoutRequestId": "...", ... }
# Rate Limit (429): { "success": false, "error": "Too many requests...", "retryAfter": 600 }
# Validation (400): { "success": false, "error": "Invalid phone number..." }
# Server Error (500): { "success": false, "error": "...", "details": "..." }
