# Quick Deployment Steps - Task 13.2

## ⚡ Fast Track Deployment

### 1. Open Supabase Dashboard
Navigate to: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/sql

### 2. Copy Deployment Script
Open file: `c:\Users\ADMIN\Music\stokika\deploy_and_test_rpc_functions.sql`
Copy ALL content (Ctrl+A, Ctrl+C)

### 3. Execute in SQL Editor
1. Paste in Supabase SQL Editor
2. Click "Run" button
3. Wait for completion (2-5 seconds)

### 4. Verify Results
Check output shows:
- ✅ Functions created successfully
- ✅ All 9 tests pass with expected results
- ✅ No errors in output

### 5. Manual Test (Optional)
Run these queries individually:

```sql
-- Test Field Agent
SELECT generate_field_agent_code('12345678');
-- Expected: SFA12345678 (with random last 4 digits)

-- Test Supervisor
SELECT generate_supervisor_code('87654321');
-- Expected: SFS87654321 (with random last 4 digits)

-- Test Error Handling
SELECT generate_field_agent_code('123');
-- Expected: ERROR: ID number must be exactly 8 digits
```

## ✅ Success Criteria

Deployment is successful when:
- [ ] Both functions exist in database
- [ ] Valid IDs return codes in format SFA/SFS + 8 digits
- [ ] Invalid IDs return error messages starting with "ERROR:"
- [ ] Generated codes are unique
- [ ] No SQL errors in execution log

## 🎯 What's Next?

After deployment:
1. Mark task 13.2 as complete
2. Proceed to task 13.3: Deploy frontend changes
3. Frontend forms will call these RPC functions

---

**Estimated Time**: 5 minutes  
**Difficulty**: Easy  
**Prerequisites**: Supabase dashboard access
