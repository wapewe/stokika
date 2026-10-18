# Deploy verify-application-code Edge Function

## Problem
The Supabase CLI has a file permission error preventing deployment:
```
EPERM: operation not permitted, open 'C:\Users\ADMIN\.supabase\telemetry.json.tmp...'
```

## Solution Options

### Option 1: Deploy via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/functions
   - Login to your account

2. **Create New Function**
   - Click "Create a new function"
   - Name: `verify-application-code`
   - Uncheck "Verify JWT" (function handles anonymous requests)

3. **Copy the Code**
   - Open: `supabase/functions/verify-application-code/index.ts`
   - Copy all contents
   - Paste into the dashboard editor

4. **Deploy**
   - Click "Deploy function"
   - Wait for deployment to complete

5. **Test the Function**
   ```bash
   curl -X POST \
     https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/verify-application-code \
     -H "Content-Type: application/json" \
     -d '{"application_code": "SFS001"}'
   ```

### Option 2: Fix CLI Permissions (Advanced)

1. **Run PowerShell as Administrator**
2. **Remove telemetry file lock**:
   ```powershell
   Remove-Item -Force -ErrorAction SilentlyContinue "C:\Users\ADMIN\.supabase\telemetry.json*"
   ```

3. **Try deployment again**:
   ```powershell
   cd C:\Users\ADMIN\Music\stokika
   npx supabase functions deploy verify-application-code --no-verify-jwt --project-ref eidsqrnwfndruuufyacc
   ```

### Option 3: Use Supabase Access Token

1. **Get your access token**
   - Visit: https://supabase.com/dashboard/account/tokens
   - Create a new token or copy existing one

2. **Deploy with token**:
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "your-token-here"
   npx supabase functions deploy verify-application-code --no-verify-jwt --project-ref eidsqrnwfndruuufyacc
   ```

## Function Details

**Endpoint**: `https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/verify-application-code`

**Purpose**: Validates application codes and returns user details
- SFS codes → Supervisors table
- SFA codes → Field Agents table

**Request**:
```json
{
  "application_code": "SFS001"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "application_code": "SFS001",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+254712345678",
    "status": "active",
    "approval_status": "approved",
    "created_at": "2024-01-01T00:00:00Z",
    "user_type": "supervisor"
  }
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "CODE_NOT_FOUND",
  "message": "Application code not found. Please check your code or contact support.",
  "userType": "supervisor"
}
```

## Integration

The function is already integrated in:
- `kit-payment.html` - User type selection dropdown
- `js/pages/kit-payment.page.js` - Application code validation

Once deployed, the validation will work automatically!

## Status

✅ Function code created
✅ Function integrated in frontend
⏳ **Needs deployment** (use Option 1 recommended)

## Next Steps After Deployment

1. Test the function endpoint
2. Test user type validation on kit-payment.html
3. Verify error messages display correctly
4. Test with both SFS and SFA codes
