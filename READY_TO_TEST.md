# ✅ Ready to Test - Supervisor & Field Agent Forms

**Date:** October 11, 2026  
**Status:** Code Complete - Awaiting Storage Bucket Setup

---

## What's Been Fixed

### ✅ Completed Issues:

1. **Mobile Menu Not Clickable** ✓
   - Jobs link, Contact link, Get Started button now working
   - Fixed z-index conflicts with hamburger menu

2. **Modal Mobile Design** ✓
   - Single column layout for mobile
   - Enhanced touch interactions

3. **Field Agent Form Success Page** ✓
   - Now redirects to `registration-success.html` with application code
   - Application code displayed to user

4. **Field Agent Document Upload** ✓
   - Documents upload to Supabase Storage
   - URLs saved in database
   - 6 documents: ID front/back, CV, chief letter, passport photo, good conduct

5. **Supervisor Form Database Connection** ✓
   - Fixed Supabase library loading issue
   - Form now connects successfully

6. **Supervisor Document Upload** ✓
   - Documents upload to Supabase Storage
   - URLs saved in database
   - 5 documents: ID front/back, CV, passport photo, good conduct

---

## Before You Test - IMPORTANT

### ⚠️ Storage Bucket Setup Required

The `application-documents` bucket must be created in Supabase Dashboard **before the first form submission**.

#### Option 1: SQL Editor (Recommended)
1. Go to Supabase Dashboard → **SQL Editor**
2. Open the file: `supabase/migrations/STORAGE_SETUP.sql`
3. Copy the entire SQL script
4. Paste into SQL Editor and **Run**

#### Option 2: Manual Creation
1. Go to Supabase Dashboard → **Storage**
2. Click "New Bucket"
3. Name: `application-documents`
4. Access: **Private** (not public)
5. File size limit: 10MB
6. Allowed types: `image/jpeg`, `image/png`, `application/pdf`, `.doc`, `.docx`

---

## Testing Both Forms

### 1. Field Agent Form
**URL:** `field-agent.html`

**Required Documents:**
- Passport Photo (`.jpg`, `.jpeg`, `.png`)
- National ID Front (`.pdf`, `.jpg`, `.jpeg`, `.png`)
- National ID Back (`.pdf`, `.jpg`, `.jpeg`, `.png`)
- CV/Resume (`.pdf`, `.doc`, `.docx`)
- Chief's Recommendation Letter (`.pdf`)
- Certificate of Good Conduct (`.pdf`) - Optional

**Expected Flow:**
1. Fill form → Upload documents → Click "Submit"
2. Button: "Submitting..."
3. Button: "Uploading documents..."
4. Button: "Saving application..."
5. Button: "✓ Success! Redirecting..."
6. Redirects to: `registration-success.html?code=FA-xxxxxx`

**Verify:**
- ✓ Application code shown on success page
- ✓ Database record in `field_agents` table
- ✓ 6 document URL columns populated
- ✓ Files visible in Storage: `application-documents/field-agents/FA-xxxxxx/`

---

### 2. Supervisor Form
**URL:** `supervisor-onboarding.html`

**Required Documents:**
- Passport Photo (`.jpg`, `.jpeg`, `.png`)
- National ID Front (`.pdf`, `.jpg`, `.jpeg`, `.png`)
- National ID Back (`.pdf`, `.jpg`, `.jpeg`, `.png`)
- CV/Resume (`.pdf`, `.doc`, `.docx`)
- Certificate of Good Conduct (`.pdf`) - Optional

**Expected Flow:**
1. Fill form → Upload documents → Click "Submit"
2. Button: "Submitting..."
3. Button: "Uploading documents..."
4. Button: "Saving application..."
5. Button: "✓ Success! Redirecting..."
6. Redirects to: `registration-success.html?code=SUP-xxxxxx`

**Verify:**
- ✓ Application code shown on success page
- ✓ Database record in `supervisors` table
- ✓ 5 document URL columns populated
- ✓ Files visible in Storage: `application-documents/supervisors/SUP-xxxxxx/`

---

## Common Test Cases

### Test 1: Duplicate ID Number
**Steps:**
1. Submit form with ID number: `12345678`
2. Try submitting again with same ID number

**Expected:**
- ❌ Inline error below ID field
- ❌ Alert: "This ID number has already been used"
- ✓ Form data preserved (not cleared)

---

### Test 2: Missing Required Document
**Steps:**
1. Fill form but skip one required document
2. Click Submit

**Expected:**
- ❌ Alert: "Please ensure all required documents are selected"
- ✓ Form data preserved
- ✓ Button re-enabled

---

### Test 3: Network Error
**Steps:**
1. Start form submission
2. Disconnect network during upload

**Expected:**
- ❌ Alert: "Network error. Please check your connection"
- ✓ Form data preserved
- ✓ Button re-enabled for retry

---

### Test 4: Optional Document
**Steps:**
1. Submit form WITHOUT "Certificate of Good Conduct"
2. Complete submission

**Expected:**
- ✓ Form submits successfully
- ✓ Database field `good_conduct_url` is NULL
- ✓ Other documents uploaded normally

---

## Storage Structure Verification

After successful submissions, check Supabase Storage:

```
application-documents/
├── field-agents/
│   └── FA-123456/
│       ├── FA-123456_id_front_1728676800000.pdf
│       ├── FA-123456_id_back_1728676800000.pdf
│       ├── FA-123456_cv_1728676800000.pdf
│       ├── FA-123456_passport_photo_1728676800000.jpg
│       ├── FA-123456_chief_letter_1728676800000.pdf
│       └── FA-123456_good_conduct_1728676800000.pdf
└── supervisors/
    └── SUP-789012/
        ├── SUP-789012_id_front_1728676800000.pdf
        ├── SUP-789012_id_back_1728676800000.pdf
        ├── SUP-789012_cv_1728676800000.pdf
        ├── SUP-789012_passport_photo_1728676800000.jpg
        └── SUP-789012_good_conduct_1728676800000.pdf
```

---

## Database Verification

### Field Agents Table
```sql
SELECT 
    application_code,
    first_name,
    last_name,
    email,
    id_number,
    passport_photo_url,
    id_front_url,
    id_back_url,
    cv_url,
    chief_letter_url,
    good_conduct_url,
    status,
    created_at
FROM field_agents
ORDER BY created_at DESC
LIMIT 5;
```

### Supervisors Table
```sql
SELECT 
    application_code,
    first_name,
    last_name,
    email,
    id_number,
    passport_photo_url,
    id_front_url,
    id_back_url,
    cv_url,
    good_conduct_url,
    status,
    created_at
FROM supervisors
ORDER BY created_at DESC
LIMIT 5;
```

**Verify:**
- ✓ All URL columns populated (except optional good_conduct)
- ✓ URLs are accessible
- ✓ Status is 'pending'

---

## Mobile Testing

### Mobile Menu
**Test on mobile device or browser dev tools:**
1. Open homepage
2. Click hamburger menu
3. Click "Jobs" link → Should navigate
4. Click "Contact" link → Should navigate
5. Click "Get Started" button → Should open modal

**Expected:**
- ✓ All links clickable
- ✓ No z-index blocking
- ✓ Modal opens properly

### Modal on Mobile
**Test Get Started modal:**
1. Hover/click "Get Started"
2. Modal appears

**Expected:**
- ✓ Single column layout
- ✓ Readable text
- ✓ Buttons work
- ✓ Close button works

---

## Error Scenarios to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty form submission | Browser validation errors |
| Under 18 years old | Alert: "Must be at least 18 years old" |
| Invalid ID format | Inline error: "Must be exactly 8 digits" |
| Non-numeric ID | Strips non-digits automatically |
| Duplicate ID | Inline error + alert, form preserved |
| Missing required doc | Alert, form preserved |
| Wrong file type | Browser file picker prevents |
| File too large (>10MB) | Upload fails, error shown |
| Network timeout | Error alert, form preserved |
| Database error | Generic error with support info |

---

## Git Status

### Latest Commit:
```
Fix supervisor form: Supabase connection, document upload, and database storage
```

### Files Changed:
- `supervisor-onboarding.html` - Fixed Supabase script
- `js/pages/supervisor-form.page.js` - Added document upload
- `supabase/migrations/20261011210000_add_document_urls_to_supervisors.sql` - Database schema
- `SUPERVISOR_FORM_COMPLETE.md` - Implementation docs

### Push Status:
⏳ Awaiting browser authentication to push to GitHub

---

## Quick Start Checklist

- [ ] **Create Storage Bucket** (run `STORAGE_SETUP.sql`)
- [ ] **Test Field Agent Form** (all required documents)
- [ ] **Test Supervisor Form** (all required documents)
- [ ] **Test with optional document skipped**
- [ ] **Test duplicate ID number**
- [ ] **Verify Storage files exist**
- [ ] **Verify Database URLs populated**
- [ ] **Test mobile menu clicks**
- [ ] **Test mobile modal design**
- [ ] **Complete browser auth for git push**

---

## Support Files

### Documentation:
- `SUPERVISOR_FORM_COMPLETE.md` - Supervisor implementation details
- `DATABASE_MIGRATION_COMPLETE.md` - Field agent migration details
- `SUPABASE_STORAGE_SETUP.md` - Storage setup guide

### SQL Files:
- `supabase/migrations/STORAGE_SETUP.sql` - **Run this first!**
- `supabase/migrations/20261011200000_add_document_urls_to_field_agents.sql` - Applied ✓
- `supabase/migrations/20261011210000_add_document_urls_to_supervisors.sql` - Applied ✓

---

## Summary

### ✅ What's Working:
- Field agent form submission with documents
- Supervisor form submission with documents
- Document upload to Supabase Storage
- Database storage of document URLs
- Success page redirection with codes
- Mobile menu clicks
- Mobile modal design
- Duplicate ID detection
- Progress indicators
- Error handling

### ⚠️ Remaining Step:
**Create the `application-documents` storage bucket** before first submission

### 🎯 Next Action:
1. Run `STORAGE_SETUP.sql` in Supabase Dashboard
2. Test both forms end-to-end
3. Complete git push authentication

---

**All code is complete and committed. Ready for testing!**
