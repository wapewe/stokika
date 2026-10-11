# M-Pesa Payment Timeout Detection Setup Guide

## Overview

This document explains how to set up and use the automatic timeout detection mechanism for M-Pesa STK Push payments in the Stokika platform.

**Feature**: secure-mpesa-integration  
**Task**: 8 - Implement timeout detection mechanism  
**Requirement**: 3.2  
**Property**: 11 - Timeout Detection

## What It Does

The timeout detection mechanism automatically identifies M-Pesa payments that have been in 'pending' status for more than 90 seconds without receiving a callback from M-Pesa. These payments are automatically marked as 'timeout' so users can retry their payment.

### Key Features

- Automatically detects payments pending > 90 seconds
- Updates status to 'timeout' with appropriate failure reason
- Only checks payments that were actually initiated (have checkout_request_id)
- Idempotent - safe to run multiple times
- Provides monitoring view for real-time status tracking
- Includes property-based tests for correctness verification

## Database Components

### 1. Main Function: detect_payment_timeouts()

**Purpose**: Finds and marks timed-out payments

**Returns**:
- updated_count: Number of payments marked as timeout
- updated_ids: Array of payment IDs that were updated

**Usage**:
```sql
-- Manually trigger timeout detection
SELECT * FROM detect_payment_timeouts();
```

### 2. Monitoring View: v_pending_payment_status

**Purpose**: Real-time monitoring of pending payment timeout risk

**Usage**:
```sql
-- View all pending payments with risk indicators
SELECT * FROM v_pending_payment_status;

-- View only at-risk payments
SELECT * FROM v_pending_payment_status 
WHERE timeout_risk IN ('WARNING', 'SHOULD_TIMEOUT');
```

## Setup Instructions

### Option 1: Using pg_cron (Recommended for Supabase)

```sql
-- Schedule timeout detection to run every 2 minutes
SELECT cron.schedule(
    'detect-payment-timeouts',
    '*/2 * * * *',
    'SELECT detect_payment_timeouts();'
);
```

### Option 2: Using Supabase Edge Function

Deploy a scheduled Edge Function that runs every 2 minutes.

### Option 3: External Cron Job

Set up a cron job on your server to call the function periodically.

## Testing

Run property-based tests:
```bash
npm test tests/mpesa/timeout-detection.property.test.ts
```

---

**Implementation Date**: August 26, 2026
**Task**: 8 - Implement timeout detection mechanism  
**Status**: Complete
