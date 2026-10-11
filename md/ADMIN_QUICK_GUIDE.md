# Admin Quick Guide - Application Code System

## Overview
The new system uses unique application codes (SFA-YYYYMMDD-XXXX for field agents, STS-YYYYMMDD-XXXX for supervisors) to track applications and payments BEFORE creating user accounts.

## How to Send Payment Links

### Step 1: View Applications
1. Log in to admin dashboard
2. Click "Onboarding" tab
3. View "Field Agent Applications" or "Supervisor Applications" section
4. You'll see a table with application codes

### Step 2: Generate Payment Link
1. Find the application you want to send payment link for
2. Click "Send Payment Link" button
3. A modal will appear with:
   - Applicant name
   - Email
   - Application code (e.g., SFA-20250115-0001)
   - Payment link (automatically copied to clipboard)

### Step 3: Send Link to Applicant
**Option 1: Email**
- Click "Send via Email" button in modal
- Compose email with payment link

**Option 2: Manual**
- Copy the payment link from modal
- Send via SMS, WhatsApp, or email manually

**Payment Link Format:**
```
https://stokika.com/html/kit-payment.html?code=SFA-20250115-0001
```

## How Applicants Use the Link

1. Applicant clicks payment link
2. System verifies their application code
3. Applicant sees their details and kit information
4. Applicant completes M-Pesa payment
5. Payment is submitted with their application code

## How to Verify Payments

### Step 1: View Payment Submissions
1. Go to "Onboarding" tab
2. Look for payment notifications
3. Or check "Ongoing Onboarding" section

### Step 2: Verify Payment
1. Click "View Steps" for the applicant
2. Check "Stokika Kit Payment" section
3. You'll see:
   - Payment amount
   - M-Pesa code
   - Payment status (pending/verified/rejected)
4. Click "Verify Payment" if payment is valid
5. Click "Reject Payment" if payment is invalid

### Step 3: Create Account
After payment is verified:
1. Click "Approve" button for the application
2. System creates user account
3. Application code becomes employment number
4. User receives login credentials

## Application Code Format

### Field Agents
- Format: `SFA-YYYYMMDD-XXXX`
- Example: `SFA-20250115-0001`
- SFA = Stokika Field Agent

### Supervisors
- Format: `STS-YYYYMMDD-XXXX`
- Example: `STS-20250115-0042`
- STS = Stokika Supervisor

## Common Scenarios

### Scenario 1: Applicant Lost Their Code
**Solution:**
1. Find their application in admin dashboard
2. Look at the "Code" column
3. Send them a new payment link with their code

### Scenario 2: Payment Link Not Working
**Check:**
- Is the code correct?
- Has the application been submitted?
- Is the link complete? (should include `?code=`)

**Solution:**
- Generate a new payment link from admin dashboard
- Verify code exists in database

### Scenario 3: Duplicate Payment
**Solution:**
1. Check payment history for the application code
2. Verify which payment is valid
3. Reject duplicate payment
4. Verify correct payment

### Scenario 4: Wrong Payment Amount
**Solution:**
1. Reject the payment with reason
2. Applicant will see rejection message
3. Applicant can submit new payment

## Important Notes

⚠️ **Do Not Create Accounts Before Payment**
- Always wait for payment verification
- This prevents orphaned accounts

✅ **Always Use Application Codes**
- Don't create manual payment links
- Use "Send Payment Link" button in dashboard

📧 **Communication**
- Include application code in all communications
- Applicants need code to access payment page

🔒 **Security**
- Only send payment links to verified email addresses
- Verify payment details before approval

## Troubleshooting

### Problem: Code Not Generated
**Solution:**
- Check if SQL schema was run in database
- Verify `generate_field_agent_code()` function exists
- Check browser console for errors

### Problem: Payment Page Shows Error
**Solution:**
- Verify application code exists in database
- Check if code format is correct
- Ensure applicant is using correct link

### Problem: Can't Find Application
**Solution:**
- Check "Field Agent Applications" tab
- Check "Supervisor Applications" tab
- Search by name or email
- Verify application was submitted successfully

## Quick Reference

| Action | Location | Button |
|--------|----------|--------|
| View Applications | Onboarding Tab | - |
| Send Payment Link | Applications Table | "Send Payment Link" |
| Verify Payment | Ongoing Onboarding | "View Steps" → "Verify Payment" |
| Approve Application | Applications Table | "Approve" |
| Reject Application | Applications Table | "Reject" |

## Support

If you need help:
1. Check this guide first
2. Check browser console for errors
3. Contact technical support
4. Provide application code and error details

---

**Last Updated**: January 15, 2025
**Version**: 1.0
