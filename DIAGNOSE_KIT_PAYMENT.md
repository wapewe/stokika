# Diagnose Kit Payment Code Verification Error

## Current Error
```
Code verification error: Error: Invalid application code. Please check and try again.
at verifyAndLoadPayment (kit-payment.page.js:116:19)
```

## Root Cause Analysis

The error occurs because the edge function `verify-application-code` is looking for an application code in the database but:
1. **Either the edge function is not deployed**, or
2. **The database has no application records**, or
3. **The code you're entering doesn't exist in the database**

## Quick Diagnosis Steps

### Step 1: Check if Edge Functions Are Deployed

Run this command:
```powershell
cd c:\Users\ADMIN\Music\stokika
supabase functions list
```

**Expected Output:**
```
verify-application-code
get-kit-payment-status
```

If you DON'T see these functions, they need to be deployed (see Step 2).

### Step 2: Deploy Edge Functions (If Missing)

```powershell
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref eidsqrnwfndruuufyacc

# Deploy the functions
supabase functions deploy verify-application-code
supabase functions deploy get-kit-payment-status
```

### Step 3: Check if Database Has Application Records

Go to your Supabase Dashboard:
1. Navigate to **Table Editor**
2. Open `field_agents` table
3. Look for records with `application_code` column filled
4. Open `supervisors` table  
5. Look for records with `application_code` column filled

**If both tables are EMPTY or have no `application_code` values**, you need to:
- **Create test data**, or
- **Wait for real applications to be submitted**

### Step 4: Create Test Data

If you need to test immediately, insert test records manually:

#### Option A: Via Supabase Dashboard SQL Editor

```sql
-- Insert test field agent
INSERT INTO field_agents (
    full_name, 
    phone, 
    email,
    county,
    id_number,
    application_code,
    approval_status,
    created_at
) VALUES (
    'Test Field Agent',
    '0712345678',
    'test.agent@example.com',
    'Nairobi',
    '12345678',
    'SFA-20261012-0001',
    'pending',
    NOW()
);

-- Insert test supervisor
INSERT INTO supervisors (
    full_name,
    phone,
    email,
    county,
    id_number,
    application_code,
    approval_status,
    created_at
) VALUES (
    'Test Supervisor',
    '0723456789',
    'test.supervisor@example.com',
    'Nairobi',
    '87654321',
    'STS-20261012-0001',
    'pending',
    NOW()
);
```

**Test Codes to Use:**
- Field Agent: `SFA-20261012-0001`
- Supervisor: `STS-20261012-0001`

#### Option B: Update Existing Records

If you already have records but they lack application codes:

```sql
-- Add application code to existing field agent (replace ID)
UPDATE field_agents 
SET application_code = 'SFA-20261012-0001'
WHERE id = 1; -- Replace with actual ID

-- Add application code to existing supervisor (replace ID)
UPDATE supervisors 
SET application_code = 'STS-20261012-0001'
WHERE id = 1; -- Replace with actual ID
```

### Step 5: Test the Edge Function Directly

Before testing in the browser, verify the edge function works:

```powershell
# Set your project details
$PROJECT_URL = "https://eidsqrnwfndruuufyacc.supabase.co"
$ANON_KEY = "YOUR_ANON_KEY_HERE"  # Get from Supabase Dashboard → Settings → API

# Test with field agent code
curl -X POST "$PROJECT_URL/functions/v1/verify-application-code" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"application_code": "SFA-20261012-0001"}'

# Test with supervisor code  
curl -X POST "$PROJECT_URL/functions/v1/verify-application-code" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"application_code": "STS-20261012-0001"}'
```

**Expected Success Response:**
```json
{
  "success": true,
  "data": {
    "application_code": "SFA-20261012-0001",
    "full_name": "Test Field Agent",
    "phone": "0712345678",
    "user_type": "field_agent",
    "approval_status": "pending",
    "created_at": "2026-10-12T..."
  }
}
```

**Expected Error Response (code not found):**
```json
{
  "success": false,
  "error": "Invalid application code. Please check and try again."
}
```

### Step 6: Test in Browser

1. Open `http://localhost:8000/kit-payment.html`
2. Enter one of your test codes:
   - `SFA-20261012-0001` (Field Agent)
   - `STS-20261012-0001` (Supervisor)
3. Click "Verify Code"
4. **Expected:** Payment dashboard loads with applicant info

## Common Issues & Solutions

### Issue 1: "Edge function not found"

**Symptoms:**
```
Error: Edge function verify-application-code not found
```

**Solution:**
Deploy the edge functions (Step 2 above).

### Issue 2: "Application code not found"

**Symptoms:**
```json
{"success": false, "error": "Invalid application code..."}
```

**Solution:**
- Check the code format matches exactly (case-sensitive)
- Verify the code exists in the database (Step 3)
- Create test data (Step 4)

### Issue 3: "Failed to initialize database connection"

**Symptoms:**
```
Error: Failed to initialize database connection
```

**Solution:**
Check your `.env` file has correct Supabase credentials:
```
VITE_SUPABASE_URL=https://eidsqrnwfndruuufyacc.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Issue 4: CORS Error

**Symptoms:**
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solution:**
The edge function already has CORS headers. Redeploy it:
```powershell
supabase functions deploy verify-application-code --no-verify-jwt
```

### Issue 5: Service Role Key Error

**Symptoms:**
```
Error: SUPABASE_SERVICE_ROLE_KEY not found
```

**Solution:**
The service role key is automatically available in edge functions. If you still get this error:

```powershell
# Get service role key from Supabase Dashboard → Settings → API
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Understanding Application Code Generation

### When Are Codes Generated?

Application codes should be automatically generated when:
1. Field agent submits application via `field-agent.html`
2. Supervisor submits application via `supervisor-onboarding.html`

### Code Format

- **Field Agent:** `SFA-YYYYMMDD-XXXX`
  - Example: `SFA-20261012-0001`
  - SFA = Stokika Field Agent
  
- **Supervisor:** `STS-YYYYMMDD-XXXX`
  - Example: `STS-20261012-0001`
  - STS = Stokika Supervisor

### Checking Submitted Applications

1. Go to your admin dashboard or Supabase Table Editor
2. Check `field_agents` table for recent submissions
3. Look for the `application_code` column
4. Use those codes for testing payment flow

## Verification Checklist

- [ ] Edge functions deployed (`supabase functions list`)
- [ ] Database has `application_code` column in both tables
- [ ] At least one test record exists with an application code
- [ ] Test code works via curl/Postman
- [ ] Browser console shows no Supabase connection errors
- [ ] Correct `.env` variables are set

## Next Steps

Once code verification works:
1. ✅ Test the full payment flow
2. ✅ Verify M-Pesa integration (if applicable)
3. ✅ Test payment status retrieval
4. ✅ Test payment confirmation

## Getting Application Codes from Real Submissions

If you want to test with real application data:

1. Go to `http://localhost:8000/field-agent.html`
2. Fill out and submit a field agent application
3. Check the browser console or database for the generated code
4. Use that code in `kit-payment.html`

OR

1. Go to `http://localhost:8000/supervisor-onboarding.html`
2. Fill out and submit a supervisor application
3. Note the generated code
4. Use it for testing payments

## Support Resources

- **Edge Function Logs:** Supabase Dashboard → Edge Functions → Logs
- **Database Logs:** Supabase Dashboard → Database → Logs
- **Browser Console:** F12 → Console tab
- **Network Tab:** F12 → Network tab (check requests to edge functions)

---

**TIP:** Start with Step 1 (check if functions are deployed) - this is the most common issue!
