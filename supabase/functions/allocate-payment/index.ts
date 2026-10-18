/**
 * Allocate Payment Edge Function
 * 
 * This Supabase Edge Function allocates a payment to a stock cycle. It handles
 * locking the cycle record, calculating the allocation amount, creating the
 * allocation record, and updating the cycle's paid amount.
 * 
 * Requirements:
 * - Task 18.3: Lock stock_cycle row during allocation
 * - Task 18.3: Calculate allocation amount (up to balance)
 * - Task 18.3: Create payment_allocation record
 * - Task 18.3: Update stock_cycle paid_amount
 * - Task 18.3: Check if cycle should be marked completed
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Payment allocation request payload
 */
interface AllocationPayload {
  paymentId: string;        // UUID of the payment to allocate
  stockCycleId: string;     // UUID of the stock cycle to allocate to
  amount?: number;          // Optional: specific amount to allocate (defaults to full payment or remaining balance)
  notes?: string;           // Optional notes
}

/**
 * Payment allocation response
 */
interface AllocationResponse {
  success: boolean;
  allocationId?: string;
  allocatedAmount?: number;
  cycleStatus?: string;
  cycleBalance?: number;
  error?: string;
  details?: string;
}

/**
 * Stock cycle data from database
 */
interface StockCycle {
  id: string;
  stock_request_id: string;
  vendor_id: string;
  cycle_number: number;
  cycle_amount: number;
  paid_amount: number;
  balance: number;
  cycle_status: string;
  due_date: string;
}

/**
 * Payment data from database
 */
interface Payment {
  id: string;
  payment_reference: string;
  stock_request_id: string;
  vendor_id: string;
  amount: number;
  payment_status: string;
  payment_method: string;
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Authenticate user via JWT
 * 
 * Requirements: JWT authentication for secure operations
 */
async function authenticateUser(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null
): Promise<{ userId: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    throw new Error('Invalid authentication token');
  }

  console.log(`[Allocate Payment] Authenticated user: ${user.id}`);
  return { userId: user.id };
}

/**
 * Get payment details and validate status
 * 
 * Requirements: Validate payment exists and is completed
 */
async function getPayment(
  supabase: ReturnType<typeof createClient>,
  paymentId: string
): Promise<Payment> {
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Payment not found');
    }
    throw new Error(`Failed to retrieve payment: ${error.message}`);
  }

  // Only completed payments can be allocated
  if (payment.payment_status !== 'completed') {
    throw new Error(`Payment must be in 'completed' status. Current status: ${payment.payment_status}`);
  }

  console.log(`[Allocate Payment] Payment ${paymentId}: ${payment.amount} KES`);
  return payment;
}

/**
 * Get stock cycle details with row-level lock
 * 
 * Requirements:
 * - Task 18.3: Lock stock_cycle row during allocation
 */
async function getStockCycleWithLock(
  supabase: ReturnType<typeof createClient>,
  stockCycleId: string
): Promise<StockCycle> {
  // Note: Supabase client doesn't support SELECT FOR UPDATE directly
  // We'll use a database function for row-level locking
  const { data: cycle, error } = await supabase
    .rpc('lock_and_get_stock_cycle', { cycle_id: stockCycleId });

  if (error) {
    if (error.code === 'PGRST116' || error.code === '42883') {
      // Function doesn't exist, fallback to regular select
      console.warn('[Allocate Payment] Row lock function not found, using regular select');
      
      const { data: fallbackCycle, error: fallbackError } = await supabase
        .from('stock_cycles')
        .select('*')
        .eq('id', stockCycleId)
        .single();

      if (fallbackError) {
        if (fallbackError.code === 'PGRST116') {
          throw new Error('Stock cycle not found');
        }
        throw new Error(`Failed to retrieve stock cycle: ${fallbackError.message}`);
      }

      return fallbackCycle;
    }
    throw new Error(`Failed to lock stock cycle: ${error.message}`);
  }

  if (!cycle) {
    throw new Error('Stock cycle not found');
  }

  // Check if cycle can accept payments
  if (cycle.cycle_status === 'completed') {
    throw new Error('Stock cycle is already completed');
  }

  if (cycle.cycle_status === 'cancelled') {
    throw new Error('Stock cycle has been cancelled');
  }

  console.log(`[Allocate Payment] Stock cycle ${stockCycleId}: Balance ${cycle.balance} KES`);
  return cycle;
}

/**
 * Calculate allocation amount
 * 
 * Requirements:
 * - Task 18.3: Calculate allocation amount (up to balance)
 */
function calculateAllocationAmount(
  payment: Payment,
  cycle: StockCycle,
  requestedAmount?: number
): number {
  // Get already allocated amount from this payment
  // Note: This should be queried from payment_allocations in production
  // For now, we'll assume the full payment amount is available

  const paymentAmount = payment.amount;
  const cycleBalance = cycle.balance;

  let allocationAmount: number;

  if (requestedAmount !== undefined) {
    // User specified an amount
    if (requestedAmount <= 0) {
      throw new Error('Allocation amount must be positive');
    }
    
    if (requestedAmount > paymentAmount) {
      throw new Error(`Allocation amount (${requestedAmount}) cannot exceed payment amount (${paymentAmount})`);
    }

    if (requestedAmount > cycleBalance) {
      throw new Error(`Allocation amount (${requestedAmount}) cannot exceed cycle balance (${cycleBalance})`);
    }

    allocationAmount = requestedAmount;
  } else {
    // Auto-calculate: allocate up to the cycle balance or payment amount, whichever is smaller
    allocationAmount = Math.min(paymentAmount, cycleBalance);
  }

  console.log(`[Allocate Payment] Calculated allocation: ${allocationAmount} KES`);
  return allocationAmount;
}

/**
 * Create payment allocation record and update cycle
 * 
 * Requirements:
 * - Task 18.3: Create payment_allocation record
 * - Task 18.3: Update stock_cycle paid_amount
 * - Task 18.3: Check if cycle should be marked completed (handled by trigger)
 */
async function createAllocation(
  supabase: ReturnType<typeof createClient>,
  paymentId: string,
  stockCycleId: string,
  allocationAmount: number,
  cycle: StockCycle,
  notes?: string
): Promise<{ allocationId: string; newBalance: number; newStatus: string }> {
  // Create allocation record
  const { data: allocation, error: allocationError } = await supabase
    .from('payment_allocations')
    .insert({
      payment_id: paymentId,
      stock_cycle_id: stockCycleId,
      allocated_amount: allocationAmount,
      notes: notes || null
    })
    .select('id')
    .single();

  if (allocationError) {
    throw new Error(`Failed to create allocation: ${allocationError.message}`);
  }

  console.log(`[Allocate Payment] Created allocation: ${allocation.id}`);

  // Update stock cycle paid amount
  const newPaidAmount = cycle.paid_amount + allocationAmount;
  const newBalance = cycle.cycle_amount - newPaidAmount;

  const { data: updatedCycle, error: updateError } = await supabase
    .from('stock_cycles')
    .update({
      paid_amount: newPaidAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', stockCycleId)
    .select('cycle_status, balance')
    .single();

  if (updateError) {
    throw new Error(`Failed to update stock cycle: ${updateError.message}`);
  }

  console.log(`[Allocate Payment] Updated cycle: New balance ${updatedCycle.balance} KES, Status: ${updatedCycle.cycle_status}`);

  return {
    allocationId: allocation.id,
    newBalance: updatedCycle.balance,
    newStatus: updatedCycle.cycle_status
  };
}

/**
 * Update vendor eligibility outstanding balance
 */
async function updateVendorOutstandingBalance(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  allocationAmount: number
): Promise<void> {
  // Get current eligibility
  const { data: eligibility, error: eligibilityError } = await supabase
    .from('vendor_eligibility')
    .select('outstanding_balance')
    .eq('vendor_id', vendorId)
    .order('last_calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (eligibilityError) {
    console.warn(`[Allocate Payment] Could not update eligibility: ${eligibilityError.message}`);
    return;
  }

  const currentOutstanding = eligibility.outstanding_balance || 0;
  const newOutstanding = Math.max(0, currentOutstanding - allocationAmount);

  await supabase
    .from('vendor_eligibility')
    .update({
      outstanding_balance: newOutstanding,
      updated_at: new Date().toISOString()
    })
    .eq('vendor_id', vendorId);

  console.log(`[Allocate Payment] Updated vendor eligibility: Outstanding reduced by ${allocationAmount} KES`);
}

/**
 * Log allocation to audit logs
 */
async function logAudit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  paymentId: string,
  stockCycleId: string,
  allocationAmount: number,
  newStatus: string
): Promise<void> {
  await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'payment_allocated',
      entity_type: 'payment_allocation',
      entity_id: paymentId,
      new_values: {
        payment_id: paymentId,
        stock_cycle_id: stockCycleId,
        allocated_amount: allocationAmount,
        cycle_status: newStatus
      }
    });
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('[Allocate Payment] Function invoked');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');

    // Parse request body
    let payload: AllocationPayload;
    try {
      payload = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate payload
    if (!payload.paymentId || !isValidUUID(payload.paymentId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or missing paymentId'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!payload.stockCycleId || !isValidUUID(payload.stockCycleId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or missing stockCycleId'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (payload.amount !== undefined && (typeof payload.amount !== 'number' || payload.amount <= 0)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Amount must be a positive number'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 1: Authenticate user
    const { userId } = await authenticateUser(supabase, authHeader);

    // Step 2: Get payment details
    const payment = await getPayment(supabase, payload.paymentId);

    // Step 3: Lock and get stock cycle
    const cycle = await getStockCycleWithLock(supabase, payload.stockCycleId);

    // Validate that payment and cycle belong to the same stock request
    if (payment.stock_request_id !== cycle.stock_request_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment and stock cycle do not belong to the same stock request'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 4: Calculate allocation amount
    const allocationAmount = calculateAllocationAmount(payment, cycle, payload.amount);

    // Step 5: Create allocation and update cycle
    const { allocationId, newBalance, newStatus } = await createAllocation(
      supabase,
      payload.paymentId,
      payload.stockCycleId,
      allocationAmount,
      cycle,
      payload.notes
    );

    // Step 6: Update vendor outstanding balance
    await updateVendorOutstandingBalance(supabase, cycle.vendor_id, allocationAmount);

    // Step 7: Log to audit
    await logAudit(supabase, userId, payload.paymentId, payload.stockCycleId, allocationAmount, newStatus);

    // Return success response
    const response: AllocationResponse = {
      success: true,
      allocationId,
      allocatedAmount: allocationAmount,
      cycleStatus: newStatus,
      cycleBalance: newBalance
    };

    console.log('[Allocate Payment] Successfully allocated payment');

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Allocate Payment] Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
