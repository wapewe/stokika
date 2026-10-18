# Deploy Edge Functions to Supabase

## Prerequisites

You need to authenticate with Supabase before deploying Edge Functions.

## Option 1: Using Access Token (Recommended for CI/CD)

1. **Get your Supabase Access Token:**
   - Go to https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Give it a name (e.g., "Stokika Deployment")
   - Copy the token (you won't see it again!)

2. **Set the token as environment variable:**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "your-access-token-here"
   ```

3. **Deploy all functions:**
   ```powershell
   npx supabase functions deploy --no-verify-jwt --project-ref eidsqrnwfndruuufyacc
   ```

## Option 2: Using Supabase CLI Login (Interactive)

1. **Login to Supabase:**
   ```powershell
   npx supabase login
   ```
   This will open a browser for authentication.

2. **Link your project:**
   ```powershell
   npx supabase link --project-ref eidsqrnwfndruuufyacc
   ```

3. **Deploy all functions:**
   ```powershell
   npx supabase functions deploy --no-verify-jwt
   ```

## Deploy Individual Functions

If you need to deploy specific functions only:

```powershell
# Deploy a single function
npx supabase functions deploy mpesa-stk-push --no-verify-jwt --project-ref eidsqrnwfndruuufyacc

# Deploy multiple specific functions
npx supabase functions deploy mpesa-stk-push mpesa-stk-callback payment-status --no-verify-jwt --project-ref eidsqrnwfndruuufyacc
```

## Your Edge Functions List

- `allocate-payment`
- `calculate-stock-eligibility`
- `calculate-supplier-score`
- `calculate-vendor-score`
- `chul-c2b-confirmation`
- `chul-c2b-validation`
- `config-service`
- `create-vendor-from-payment`
- `create-vendor-registration-payment`
- `get-config`
- `get-kit-payment-status`
- `get-registration-fee`
- `match-supplier`
- `metrics-export`
- `mpesa-callback`
- `mpesa-status-query`
- `mpesa-stk-callback`
- `mpesa-stk-push`
- `payment-status`
- `process-stock-request`
- `scheduled-cycle-check`
- `scheduled-scoring-update`
- `send-payment-notification`
- `timeout-monitor`
- `validate-vendor-registration`
- `vendor-registration`
- `verify-application-code`

## Verify Deployment

After deployment, verify in the Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/functions
2. Check that all functions are listed and have recent deployment timestamps

## Troubleshooting

### Permission Errors (EPERM)
If you get `EPERM: operation not permitted` errors:
- Run PowerShell as Administrator
- Or use the access token method instead of CLI login

### Function Not Found
If a function doesn't appear after deployment:
- Check the function has an `index.ts` file
- Verify there are no syntax errors in the function code
- Check the deployment logs for specific errors

## Important Notes

- The `--no-verify-jwt` flag is used because authentication is handled by RLS policies
- All functions are deployed to your project: `eidsqrnwfndruuufyacc`
- Deployment typically takes 1-2 minutes per function
- You can deploy while the project is running - no downtime

## Quick Deploy Command

Copy and run this command after setting your access token:

```powershell
# Set token first (replace with your actual token)
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxxxxxxxxxxxxxxxxxx"

# Deploy all functions
npx supabase functions deploy --no-verify-jwt --project-ref eidsqrnwfndruuufyacc
```
