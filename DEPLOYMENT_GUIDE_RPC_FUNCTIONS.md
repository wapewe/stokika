# RPC Functions Deployment Guide

## Task 13.2: Deploy RPC Functions to Supabase

This guide provides step-by-step instructions for deploying the `generate_field_agent_code` and `generate_supervisor_code` RPC functions to your Supabase production database.

---

## 📋 Pre-Deployment Checklist

- [x] RPC functions created in tasks 2.1 and 3.1
- [x] Database schema updates completed (task 1)
- [x] Test SQL script generated
- [ ] Supabase Dashboard access confirmed
- [ ] Database backup created (recommended)

---

## 🚀 Deployment Steps

### Step 1: Access Supabase SQL Editor

1. Open your web browser and navigate to:
   ```
   https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/sql
   ```

2. Sign in to your Supabase account if prompted

3. You should see the SQL Editor interface

### Step 2: Open the Deployment Script

1. Locate the file: `c:\Users\ADMIN\Music\stokika\deploy_and_test_rpc_functions.sql`

2. Open it in a text editor (VS Code, Notepad++, or any editor)

3. Copy the ENTIRE contents of the file (Ctrl+A, then Ctrl+C)

### Step 3: Execute the Deployment Script

1. In the Supabase SQL Editor, paste the copied SQL script

2. Click the **"Run"** button (or press Ctrl+Enter)

3. Wait for the script to execute (should take 2-5 seconds)

4. Review the output in the Results panel

### Step 4: Verify Deployment Success

The script will automatically run verification queries. Check the results:

#### Expected Output 1: Functions Exist
```
function_name               | is_security_definer | volatility
----------------------------|---------------------|------------
generate_field_agent_code   | true                | v
generate_supervisor_code    | true                | v
```

#### Expected Output 2: Test Results
You should see results for 9 tests:

1. **TEST 1**: Returns code like `SFA12345678` ✓
2. **TEST 2**: Returns code like `SFS87654321` ✓
3. **TEST 3**: Returns `ERROR: ID number must be exactly 8 digits` ✓
4. **TEST 4**: Returns `ERROR: ID number must be exactly 8 digits` ✓
5. **TEST 5**: Returns `ERROR: ID number must contain only digits` ✓
6. **TEST 6**: Returns `ERROR: ID number is required` ✓
7. **TEST 7**: Returns `ERROR: ID number is required` ✓
8. **TEST 8**: Returns 3 unique codes all starting with `SFA5555` ✓
9. **TEST 9**: Returns `true` for both format validations ✓

---

## ✅ Verification Checklist

After deployment, verify the following:

### Function Deployment
- [ ] `generate_field_agent_code` function exists in database
- [ ] `generate_supervisor_code` function exists in database
- [ ] Both functions have `SECURITY DEFINER` enabled
- [ ] Execute permissions granted to `authenticated` and `anon` roles

### Function Behavior
- [ ] Valid 8-digit ID returns code in correct format (SFA/SFS + 8 digits)
- [ ] Invalid ID (too short/long) returns appropriate error
- [ ] Non-numeric ID returns appropriate error
- [ ] Empty/NULL ID returns appropriate error
- [ ] Generated codes are unique
- [ ] Generated codes include first 4 digits from input ID

### Sample Manual Tests (Optional)

Run these queries individually in SQL Editor:

```sql
-- Test Field Agent Code Generation
SELECT generate_field_agent_code('12345678');
-- Expected: SFA12341234 (or similar with different random 4 digits)

-- Test Supervisor Code Generation
SELECT generate_supervisor_code('87654321');
-- Expected: SFS87654321 (or similar with different random 4 digits)

-- Test Invalid Format
SELECT generate_field_agent_code('ABC12345');
-- Expected: ERROR: ID number must contain only digits

-- Test Duplicate ID (only if you have existing data)
-- First, check for existing ID numbers:
SELECT id_number FROM field_agents LIMIT 5;

-- Then try to generate code for an existing ID:
SELECT generate_field_agent_code('existing_id_here');
-- Expected: ERROR: This ID number has already been used for an application
```

---

## 🔍 Testing in Production

### Test with Real Sample IDs

Execute these queries to test with sample IDs:

```sql
-- Test 1: Field Agent with Sample ID
SELECT generate_field_agent_code('12345678') AS field_agent_code;

-- Test 2: Supervisor with Sample ID
SELECT generate_supervisor_code('87654321') AS supervisor_code;

-- Test 3: Different IDs with Same Prefix
SELECT 
    generate_field_agent_code('11112345') AS code1,
    generate_field_agent_code('11113456') AS code2,
    generate_field_agent_code('11114567') AS code3;
-- All should start with SFA1111 but have different last 4 digits

-- Test 4: Verify Code Format
SELECT 
    generate_field_agent_code('99998888') AS fa_code,
    generate_field_agent_code('99998888') ~ '^SFA[0-9]{8}$' AS fa_format_valid,
    generate_supervisor_code('11112222') AS sup_code,
    generate_supervisor_code('11112222') ~ '^SFS[0-9]{8}$' AS sup_format_valid;
```

### Expected Results:
- Field agent codes: Start with `SFA` followed by 8 digits
- Supervisor codes: Start with `SFS` followed by 8 digits
- First 4 digits after prefix match first 4 digits of input ID
- Last 4 digits are random
- All error messages start with `ERROR:`

---

## 🐛 Troubleshooting

### Issue: "Function does not exist"

**Solution:**
1. Verify you're connected to the correct database
2. Re-run the deployment script
3. Check for SQL syntax errors in the output

### Issue: "Permission denied"

**Solution:**
1. Ensure you have database admin privileges
2. Check that `SECURITY DEFINER` is set correctly
3. Verify GRANT statements executed successfully

### Issue: "Table field_agents/supervisors does not exist"

**Solution:**
1. This means database schema setup (Task 1) was not completed
2. Run the database migration from Task 1 first
3. Then re-run this deployment script

### Issue: Test returns "ERROR: Unable to generate unique code"

**Solution:**
1. This is very rare and indicates 10 code collision attempts
2. This would only happen if you have 10,000+ records with same ID prefix
3. Simply re-run the test query (new random numbers will be generated)

---

## 📊 Monitoring After Deployment

### Check Function Usage

```sql
-- View recent function calls (if logging enabled)
SELECT * FROM pg_stat_user_functions 
WHERE funcname LIKE 'generate_%_code'
ORDER BY calls DESC;
```

### Monitor for Errors

```sql
-- Check Supabase logs for any RPC errors
-- Navigate to: Logs > Postgres Logs in Supabase Dashboard
-- Filter for: generate_field_agent_code OR generate_supervisor_code
```

---

## 📝 Deployment Record

### Deployment Information

- **Task**: 13.2 - Deploy RPC functions to Supabase
- **Date**: [Fill in after deployment]
- **Deployed By**: [Your name]
- **Environment**: Production
- **Supabase Project**: eidsqrnwfndruuufyacc
- **Database**: PostgreSQL

### Functions Deployed

1. ✅ `generate_field_agent_code(id_number TEXT)`
   - Format: `SFA{first_4_id_digits}{4_random_digits}`
   - Validates: 8-digit numeric IDs
   - Enforces: ID uniqueness, code uniqueness

2. ✅ `generate_supervisor_code(id_number TEXT)`
   - Format: `SFS{first_4_id_digits}{4_random_digits}`
   - Validates: 8-digit numeric IDs
   - Enforces: ID uniqueness, code uniqueness

### Requirements Fulfilled

- ✅ **Requirement 7.1**: Accept ID number as input parameter (Field Agent)
- ✅ **Requirement 7.2**: Accept ID number as input parameter (Supervisor)
- ✅ **Requirement 7.3**: Extract first 4 digits (Field Agent)
- ✅ **Requirement 7.4**: Extract first 4 digits (Supervisor)
- ✅ **Requirement 7.5**: Generate code with SFA prefix
- ✅ **Requirement 7.6**: Generate code with SFS prefix
- ✅ **Requirement 7.7**: Check uniqueness in field_agents table
- ✅ **Requirement 7.8**: Check uniqueness in supervisors table
- ✅ **Requirement 7.9**: Return generated code as string

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Mark task 13.2 as complete
2. ⏭️ Proceed to task 13.3: Deploy frontend changes
3. 📋 Document any issues or observations
4. 🔄 Schedule post-deployment monitoring

---

## 🆘 Support

If you encounter issues during deployment:

1. Check the Supabase Dashboard logs
2. Review the error messages in SQL Editor
3. Verify database schema is up to date
4. Check that previous tasks (1, 2.1, 3.1) were completed successfully

---

## 📚 Related Documentation

- Design Document: `.kiro/specs/id-based-application-code-generation/design.md`
- Requirements Document: `.kiro/specs/id-based-application-code-generation/requirements.md`
- Tasks Document: `.kiro/specs/id-based-application-code-generation/tasks.md`

---

**Last Updated**: 2025-01-25  
**Status**: Ready for Deployment
