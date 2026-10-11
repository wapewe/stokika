# Unique Application Code System Implementation

## Overview
This document outlines the implementation of unique application codes for field agents (SFA-YYYYMMDD-XXXX) and supervisors (STS-YYYYMMDD-XXXX) that are used for payment tracking before account creation.

## Database Changes

### 1. Run SQL Schema Update
Execute the SQL file: `sql/add-application-codes.sql`

This adds:
- `application_code` column to `field_agents` table
- `application_code` column to `supervisors` table  
- `application_code` column to `stokika_kit_payments` table
- Functions to generate unique codes

### 2. Code Format
- **Field Agent**: `SFA-20250115-0001` (SFA = Stokika Field Agent)
- **Supervisor**: `STS-20250115-0001` (STS = Stokika Supervisor)

## Implementation Steps

### Step 1: Update Form Submission Scripts

#### field-agent-form.js
Replace the `handleFormSubmit` function to:
1. Call Supabase function `generate_field_agent_code()` to get unique code
2. Store code in `application_code` field
3. Display code to user in success message
4. Instruct user to save code for payment

#### supervisor-form.js  
Same as above but use `generate_supervisor_code()`

### Step 2: Update kit-payment.html
Add code input section before loading payment form:

```html
<div id="code-entry-section">
    <h2>Enter Your Application Code</h2>
    <input type="text" id="applicationCode" placeholder="e.g., SFA-20250115-0001">
    <button onclick="verifyCode()">Continue</button>
</div>
```

### Step 3: Update kit-payment.js
Replace URL parameter logic:

```javascript
// Check for code in URL or show input
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
    await verifyAndLoadPayment(code);
} else {
    showCodeEntry();
}

async function verifyCode() {
    const code = document.getElementById('applicationCode').value.trim();
    await verifyAndLoadPayment(code);
}

async function verifyAndLoadPayment(code) {
    // Verify code exists in database
    // Load application details
    // Show payment form
}
```

### Step 4: Update Admin Dashboard (admin.js)

#### Display Application Codes
In `displayAgents()` and `displaySupervisors()`, show `application_code` column

#### Generate Payment Link
Update `sendKitPaymentLink()`:
```javascript
const paymentLink = `${baseUrl}/html/kit-payment.html?code=${applicationCode}`;
```

### Step 5: Update Payment Submission
Modify `submitKitPayment()` to:
1. Use `application_code` instead of `userId`
2. Store payment with code reference
3. Admin verifies payment using code
4. Admin creates user account AFTER payment verification
5. Code becomes employment number

## Workflow

### User Journey
1. User submits application form
2. System generates unique code (SFA-XXXXXX or STS-XXXXXX)
3. User receives code on screen and via email
4. Admin reviews application
5. Admin sends payment link with code
6. User accesses payment page with code
7. User completes payment
8. Admin verifies payment
9. Admin creates user account
10. Code becomes employment number

### Admin Journey
1. View applications with codes in dashboard
2. Review application details
3. Send payment link: `https://stokika.com/html/kit-payment.html?code=SFA-20250115-0001`
4. Verify payment submission
5. Create user account
6. Assign code as employment number

## Files to Modify

1. ✅ `sql/add-application-codes.sql` - Database schema
2. ✅ `js/field-agent-form.js` - Generate code on submission
3. ✅ `js/supervisor-form.js` - Generate code on submission
4. ✅ `html/kit-payment.html` - Add code entry UI
5. ✅ `js/kit-payment.js` - Code verification logic
6. ✅ `js/admin.js` - Display codes, update payment link generation
7. ✅ `js/comprehensive-onboarding.js` - Update payment submission

## Benefits
- ✅ Payment before account creation
- ✅ Unique tracking per application
- ✅ Code becomes employment number
- ✅ No orphaned user accounts
- ✅ Better fraud prevention
- ✅ Cleaner workflow

## Next Steps
1. Run SQL schema update in Supabase
2. Update form submission scripts
3. Update payment page
4. Update admin dashboard
5. Test complete workflow
6. Deploy to production

## Testing Checklist
- [ ] Code generation works
- [ ] Codes are unique
- [ ] Payment link includes code
- [ ] Code verification works
- [ ] Payment submission with code works
- [ ] Admin can see codes
- [ ] Account creation after payment works
- [ ] Code becomes employment number
