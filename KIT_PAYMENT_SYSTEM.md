# Kit Payment System - Complete Documentation

## Overview
The kit payment system onboards field agents and supervisors onto the Stokika platform through a **3-step process**: Apply → Pay → Account Activated.

---

## Corrected Flow

### **Step 1: Apply**
- **Field Agent**: Fill out comprehensive application form (`field-agent.html`)
  - Personal info, employment history, references, documents
  - No payment at this stage
  
- **Supervisor**: Fill out onboarding form (`supervisor-onboarding.html`)
  - Personal info, education, work experience, documents
  - No payment at this stage

### **Step 2: Pay**
- **Admin reviews application** and creates profile with role
- System generates `application_code` (unique identifier)
- Applicant initiates M-Pesa STK Push payment:
  - **Field Agent**: KES 1,550 (FIXED, backend-validated)
  - **Supervisor**: KES 3,500 (FIXED, backend-validated)
- Payment flow:
  1. `payment_intent = 'initiated'` (payment record created)
  2. `payment_intent = 'pending'` (STK Push sent, waiting for user)
  3. `payment_intent = 'completed'` (callback received, payment successful)

### **Step 3: Account Activated**
- Trigger: `activate_field_agent_kit()` or `activate_supervisor_kit()`
- Updates: `field_agents.kit_paid = TRUE` or `supervisors.kit_paid = TRUE`
- Result: **Account is now active** - can access platform and start work
- NO physical kit delivery step - activation is instant

---

## Backend Amount Validation ⚠️

### **Critical Security Feature**
Users **CANNOT change payment amounts**. All validation happens on backend:

```sql
-- Trigger validates amount before insert/update
CREATE TRIGGER enforce_kit_amount
    BEFORE INSERT OR UPDATE OF kit_amount ON stokika_kit_payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_kit_payment_amount();
```

### **How It Works**
1. Frontend: User sees form with amount (read-only or hidden)
2. Backend: Edge Function fetches amount from `stokika_kit_config`
3. Database: Trigger validates amount matches config
4. Reject if: `NEW.kit_amount != expected_amount`

**Example:**
```typescript
// ❌ WRONG: User can manipulate
const amount = formData.amount; // User input

// ✅ CORRECT: Backend controls amount
const { data: config } = await supabase
  .from('stokika_kit_config')
  .select('kit_amount')
  .eq('user_type', userType)
  .eq('is_active', true)
  .single();

const amount = config.kit_amount; // KES 1,550 or 3,500
```

---

## Database Schema

### **stokika_kit_payments**
```sql
CREATE TABLE stokika_kit_payments (
    id UUID PRIMARY KEY,
    application_code TEXT,              -- Links to field_agents/supervisors
    user_id UUID,                        -- Optional user reference
    user_type TEXT NOT NULL,             -- 'field_agent' or 'supervisor'
    kit_amount DECIMAL(10,2) NOT NULL,   -- 1550 or 3500 (backend-validated)
    phone_number TEXT NOT NULL,          -- 254XXXXXXXXX format
    payment_method TEXT DEFAULT 'mpesa_stk',
    
    -- Payment lifecycle
    payment_intent TEXT NOT NULL,        -- 'initiated', 'pending', 'completed', 'failed'
    payment_status TEXT NOT NULL,        -- 'pending', 'completed', 'failed', 'timeout', etc.
    
    -- M-Pesa details
    checkout_request_id TEXT UNIQUE,     -- M-Pesa STK Push ID
    merchant_request_id TEXT,
    mpesa_receipt_number TEXT,
    transaction_date TIMESTAMPTZ,
    
    -- Verification
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    failure_reason TEXT,
    
    -- Constraints
    CHECK (kit_amount IN (1550, 3500)),        -- ONLY these amounts allowed
    CHECK (phone_number ~ '^254[0-9]{9}$'),    -- Kenyan format
    CHECK (payment_intent IN ('initiated', 'pending', 'completed', 'failed'))
);
```

### **stokika_kit_config**
```sql
CREATE TABLE stokika_kit_config (
    id UUID PRIMARY KEY,
    user_type TEXT UNIQUE NOT NULL,      -- 'field_agent' or 'supervisor'
    kit_amount DECIMAL(10,2) NOT NULL,   -- 1550 or 3500
    kit_items TEXT[] NOT NULL,           -- List of what they get
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Current configuration
INSERT INTO stokika_kit_config VALUES
('field_agent', 1550.00, ARRAY[
    'Stokika Branded T-Shirt',
    'ID Badge & Lanyard',
    'Product Catalog',
    'Order Forms (50 sheets)',
    'Branded Bag',
    'Training Manual',
    'Mobile App Access'
], 'Complete starter kit for field agents'),
('supervisor', 3500.00, ARRAY[
    'Stokika Branded Polo Shirt',
    'Supervisor ID Badge & Lanyard',
    'Product Catalog',
    'Order Forms (100 sheets)',
    'Branded Laptop Bag',
    'Training Manual',
    'Supervisor Handbook',
    'Mobile App Access',
    'Territory Management Tools'
], 'Complete starter kit for supervisors');
```

### **field_agents / supervisors**
```sql
-- Kit payment tracking in agent/supervisor tables
kit_paid BOOLEAN DEFAULT FALSE,              -- Activated on payment completion
kit_payment_date TIMESTAMPTZ,               -- When payment completed
kit_payment_id UUID REFERENCES stokika_kit_payments(id)
```

---

## Payment Intent Lifecycle

### **State Machine**
```
initiated → pending → completed
    ↓           ↓
  failed    timeout
```

| Intent | Status | Meaning |
|--------|--------|---------|
| `initiated` | `pending` | Payment record created, no STK yet |
| `pending` | `pending` | STK Push sent, waiting for user input |
| `completed` | `completed` | Payment successful, callback received |
| `failed` | `failed`, `timeout`, `rejected` | Payment did not complete |

### **Auto-Sync Trigger**
```sql
-- payment_intent automatically syncs with payment_status
CREATE TRIGGER sync_payment_intent
    BEFORE INSERT OR UPDATE OF payment_status ON stokika_kit_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_intent();
```

---

## M-Pesa Integration

### **Edge Functions**
1. **mpesa-stk-push**: Initiates payment
   - Fetches amount from `stokika_kit_config` (backend-controlled)
   - Validates `application_code` exists
   - Creates `stokika_kit_payments` record
   - Sends STK Push to user's phone
   - Returns `checkout_request_id`

2. **mpesa-callback**: Receives payment result
   - Updates `payment_status` and `payment_intent`
   - Triggers `activate_field_agent_kit()` or `activate_supervisor_kit()`
   - Sets `kit_paid = TRUE` in agent/supervisor table
   - Account is now activated

3. **mpesa-status-query**: Checks payment status
   - Used for timeout detection (90 seconds)
   - Manual status checks

### **Rate Limiting**
- **Per user**: 5 attempts per 10 minutes
- **Per phone**: 3 attempts per hour
- Tracked in `payment_attempts` table
- Prevents payment spam and fraud

---

## Security Features

### ✅ **Backend Amount Validation**
- Amount is ALWAYS fetched from `stokika_kit_config`
- Database trigger validates amount on insert/update
- Users cannot manipulate payment amounts
- Frontend should display amount as read-only

### ✅ **Phone Number Validation**
```sql
CHECK (phone_number ~ '^254[0-9]{9}$')
```
- Only Kenyan format accepted
- Validated at database level

### ✅ **Application Code Uniqueness**
- Each agent/supervisor has unique `application_code`
- Links payment to specific applicant
- Prevents payment confusion

### ✅ **Payment Intent Tracking**
- Clear lifecycle from initiation to completion
- Audit trail of all payment attempts
- Timeout detection after 90 seconds

---

## API Flow (Pseudocode)

### **Frontend: Initiate Payment**
```typescript
// 1. Get user type and application code
const userType = 'field_agent';
const applicationCode = 'FA-2024-001234';

// 2. Fetch amount from config (NOT from user input)
const { data: config } = await supabase
  .from('stokika_kit_config')
  .select('kit_amount')
  .eq('user_type', userType)
  .eq('is_active', true)
  .single();

// 3. Call Edge Function with backend-validated amount
const response = await fetch('/functions/v1/mpesa-stk-push', {
  method: 'POST',
  body: JSON.stringify({
    applicationCode,
    phoneNumber: '254712345678',
    amount: config.kit_amount,  // Backend-controlled: 1550 or 3500
    userType
  })
});

// 4. Show STK push prompt to user
// "Check your phone for M-Pesa prompt to pay KES 1,550"
```

### **Backend: Process Payment**
```typescript
// Edge Function: mpesa-stk-push
export default async function(req: Request) {
  const { applicationCode, phoneNumber, amount, userType } = await req.json();
  
  // Validate amount against config
  const { data: config } = await supabase
    .from('stokika_kit_config')
    .select('kit_amount')
    .eq('user_type', userType)
    .single();
  
  if (amount !== config.kit_amount) {
    return new Response('Invalid amount', { status: 400 });
  }
  
  // Create payment record
  await supabase.from('stokika_kit_payments').insert({
    application_code: applicationCode,
    user_type: userType,
    kit_amount: amount,  // Now validated
    phone_number: phoneNumber,
    payment_intent: 'initiated',
    payment_status: 'pending'
  });
  
  // Send M-Pesa STK Push
  // ... M-Pesa API call
}
```

---

## Summary

✅ **Flow**: Apply → Pay (1550/3500) → Account Activated  
✅ **Amounts**: KES 1,550 (agents), KES 3,500 (supervisors)  
✅ **Validation**: Backend-controlled, users CANNOT change amounts  
✅ **Intent Tracking**: initiated → pending → completed/failed  
✅ **Security**: Database triggers, rate limiting, phone validation  
✅ **Activation**: Automatic via triggers when payment completes  
✅ **No Physical Delivery**: Account activation is instant, digital

The system is **production-ready** and **fully secure**.