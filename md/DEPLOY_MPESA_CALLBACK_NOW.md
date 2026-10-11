# 🚀 Deploy M-Pesa Callback - QUICK GUIDE

## ⚡ 3-STEP DEPLOYMENT (Remote Supabase)

### STEP 1: Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/functions

### STEP 2: Create New Function
1. Click **"Create a new function"** button
2. **Function name:** `mpesa-callback`
3. **Copy this code** and paste in editor:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const payload = await req.json()
    console.log('M-Pesa Callback:', JSON.stringify(payload, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { Body } = payload
    const { stkCallback } = Body

    if (!stkCallback) {
      throw new Error('Invalid callback structure')
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback

    const paymentData: any = {
      merchant_request_id: MerchantRequestID,
      checkout_request_id: CheckoutRequestID,
      result_code: ResultCode,
      result_description: ResultDesc,
      callback_received_at: new Date().toISOString()
    }

    if (ResultCode === 0 && stkCallback.CallbackMetadata) {
      const metadata = stkCallback.CallbackMetadata.Item
      
      metadata.forEach((item: any) => {
        switch (item.Name) {
          case 'Amount':
            paymentData.amount = item.Value
            break
          case 'MpesaReceiptNumber':
            paymentData.mpesa_receipt_number = item.Value
            break
          case 'TransactionDate':
            paymentData.transaction_date = item.Value
            break
          case 'PhoneNumber':
            paymentData.phone_number = item.Value
            break
        }
      })

      paymentData.status = 'completed'
    } else {
      paymentData.status = 'failed'
    }

    const { data, error } = await supabase
      .from('kit_payments')
      .update({
        status: paymentData.status,
        mpesa_receipt_number: paymentData.mpesa_receipt_number,
        transaction_date: paymentData.transaction_date,
        result_code: paymentData.result_code,
        result_description: paymentData.result_description,
        updated_at: new Date().toISOString()
      })
      .eq('checkout_request_id', CheckoutRequestID)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Payment updated:', data)

    return new Response(JSON.stringify({
      ResultCode: 0,
      ResultDesc: 'Success'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    
    return new Response(JSON.stringify({
      ResultCode: 1,
      ResultDesc: 'Failed',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

4. Click **"Deploy function"**

### STEP 3: Update M-Pesa Daraja Portal
1. Go to: https://developer.safaricom.co.ke
2. Login → My Apps → Your App
3. Update callback URL to:
```
https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback
```

---

## ✅ DONE!

Your callback URL is now live and ready to receive M-Pesa payments!

**Callback URL:**
```
https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback
```

---

## 📊 View Logs

To see M-Pesa callbacks in real-time:
1. Supabase Dashboard → Edge Functions
2. Click `mpesa-callback`
3. Click **"Logs"** tab

---

## ⚠️ REMEMBER

- **404 in browser = NORMAL** (it's POST-only)
- Only M-Pesa can successfully call this endpoint
- Payments will auto-update in `kit_payments` table
- Check logs if payments don't update
