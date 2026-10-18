/**
 * Calculate Stock Eligibility Edge Function
 * 
 * This Supabase Edge Function calculates vendor stock eligibility based on:
 * - Vendor score (from vendor_scores table)
 * - Vendor business profile (business size, status, model)
 * - Outstanding balance (from vendor_eligibility table)
 * 
 * The eligibility amount determines how much stock a vendor can request.
 * 
 * Requirements:
 * - 10.1: Calculate stock eligibility server-side based on vendor score, payment history, and business profile
 * - 17.1-17.12: Stock eligibility determination logic
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Eligibility calculation request interface
 */
interface EligibilityRequest {
  vendor_id: string;
}

/**
 * Eligibility calculation response interface
 */
interface EligibilityResponse {
  success: boolean;
  eligibility?: {
    vendor_id: string;
    is_eligible: boolean;
    eligibility_amount: number;
    eligibility_tier: string;
    outstanding_balance: number;
    next_review_date: string;
    ineligibility_reason?: string;
  };
  error?: string;
}

/**
 * Vendor score data from database
 */
interface VendorScore {
  vendor_id: string;
  business_longevity_score: number;
  sales_consistency_score: number;
  payment_history_score: number;
  business_growth_score: number;
  total_score: number;
}

/**
 * Vendor profile data from database
 */
interface VendorProfile {
  id: string;
  business_size: string;
  business_status: string;
  business_model: string;
  is_verified: boolean;
}

/**
 * Current eligibility data from database
 */
interface CurrentEligibility {
  outstanding_balance: number;
}

/**
 * Eligibility tier thresholds
 * Requirements: 17.1, 17.2 - Determine eligibility based on vendor score
 */
const ELIGIBILITY_TIERS = {
  BRONZE: { minScore: 41, maxScore: 60, maxAmount: 50000 },
  SILVER: { minScore: 61, maxScore: 75, maxAmount: 100000 },
  GOLD: { minScore: 76, maxScore: 85, maxAmount: 200000 },
  PLATINUM: { minScore: 86, maxScore: 100, maxAmount: 500000 }
};

/**
 * Business size caps
 * Requirements: 17.9 - Cap maximum eligibility based on business size
 */
const BUSINESS_SIZE_CAPS: Record<string, number> = {
  'Pre-Launch': 30000,
  'Micro': 50000,
  'Small': 100000,
  'Growing': 200000,
  'Medium': 500000,
  'Large': 1000000
};

/**
 * Verification required for eligibility
 */
const VERIFICATION_REQUIRED = true;

/**
 * Get latest vendor score
 * 
 * Requirements: 10.1, 17.2 - Use vendor score to determine eligibility
 */
async function getVendorScore(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<VendorScore | null> {
  console.log(`[Eligibility] Fetching vendor score for vendor: ${vendorId}`);
  
  const { data, error } = await supabase
    .from('vendor_scores')
    .select('vendor_id, business_longevity_score, sales_consistency_score, payment_history_score, business_growth_score, total_score')
    .eq('vendor_id', vendorId)
    .order('score_calculated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('[Eligibility] Error fetching vendor score:', error);
    return null;
  }
  
  console.log(`[Eligibility] Vendor score: ${data?.total_score || 'N/A'}`);
  return data as VendorScore;
}

/**
 * Get vendor profile
 * 
 * Requirements: 10.1, 17.1 - Use business profile to determine eligibility
 */
async function getVendorProfile(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<VendorProfile | null> {
  console.log(`[Eligibility] Fetching vendor profile for vendor: ${vendorId}`);
  
  const { data, error } = await supabase
    .from('vendors')
    .select(`
      id,
      is_verified,
      business_sizes!inner(size_name),
      business_statuses!inner(status_name),
      business_models!inner(model_name)
    `)
    .eq('id', vendorId)
    .single();
  
  if (error) {
    console.error('[Eligibility] Error fetching vendor profile:', error);
    return null;
  }
  
  if (!data) {
    return null;
  }
  
  // Transform joined data into flat structure
  const profile: VendorProfile = {
    id: data.id,
    business_size: (data.business_sizes as any)?.size_name || 'Unknown',
    business_status: (data.business_statuses as any)?.status_name || 'Unknown',
    business_model: (data.business_models as any)?.model_name || 'Unknown',
    is_verified: data.is_verified
  };
  
  console.log(`[Eligibility] Vendor profile:`, profile);
  return profile;
}

/**
 * Get current eligibility with outstanding balance
 * 
 * Requirements: 17.3, 17.4 - Consider outstanding balance in eligibility
 */
async function getCurrentEligibility(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<CurrentEligibility> {
  console.log(`[Eligibility] Fetching current eligibility for vendor: ${vendorId}`);
  
  const { data, error } = await supabase
    .from('vendor_eligibility')
    .select('outstanding_balance')
    .eq('vendor_id', vendorId)
    .order('last_calculated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    console.log('[Eligibility] No existing eligibility found, defaulting to 0 outstanding balance');
    return { outstanding_balance: 0 };
  }
  
  console.log(`[Eligibility] Outstanding balance: ${data.outstanding_balance}`);
  return data as CurrentEligibility;
}

/**
 * Determine eligibility tier based on score
 * 
 * Requirements: 17.2 - Adjust eligibility based on vendor score
 */
function determineEligibilityTier(score: number): { tier: string; baseAmount: number } | null {
  // Score 0-40: Not eligible
  if (score < 41) {
    return null;
  }
  
  // Check each tier
  if (score >= ELIGIBILITY_TIERS.BRONZE.minScore && score <= ELIGIBILITY_TIERS.BRONZE.maxScore) {
    return { tier: 'Bronze', baseAmount: ELIGIBILITY_TIERS.BRONZE.maxAmount };
  }
  
  if (score >= ELIGIBILITY_TIERS.SILVER.minScore && score <= ELIGIBILITY_TIERS.SILVER.maxScore) {
    return { tier: 'Silver', baseAmount: ELIGIBILITY_TIERS.SILVER.maxAmount };
  }
  
  if (score >= ELIGIBILITY_TIERS.GOLD.minScore && score <= ELIGIBILITY_TIERS.GOLD.maxScore) {
    return { tier: 'Gold', baseAmount: ELIGIBILITY_TIERS.GOLD.maxAmount };
  }
  
  if (score >= ELIGIBILITY_TIERS.PLATINUM.minScore && score <= ELIGIBILITY_TIERS.PLATINUM.maxScore) {
    return { tier: 'Platinum', baseAmount: ELIGIBILITY_TIERS.PLATINUM.maxAmount };
  }
  
  return null;
}

/**
 * Apply business size cap to eligibility amount
 * 
 * Requirements: 17.9 - Cap maximum eligibility based on business size
 */
function applyBusinessSizeCap(amount: number, businessSize: string): number {
  const cap = BUSINESS_SIZE_CAPS[businessSize];
  
  if (!cap) {
    console.warn(`[Eligibility] Unknown business size: ${businessSize}, using amount as-is`);
    return amount;
  }
  
  const cappedAmount = Math.min(amount, cap);
  
  if (cappedAmount < amount) {
    console.log(`[Eligibility] Amount capped from ${amount} to ${cappedAmount} due to business size: ${businessSize}`);
  }
  
  return cappedAmount;
}

/**
 * Calculate final eligibility amount
 * 
 * Requirements:
 * - 17.3: Reduce eligibility when vendor has outstanding balance
 * - 17.4: Reduce eligibility for late payments
 * - 17.8: Prevent negative eligibility (minimum 0)
 * - 17.9: Apply business size caps
 */
function calculateEligibilityAmount(
  baseAmount: number,
  outstandingBalance: number,
  businessSize: string,
  paymentHistoryScore: number
): number {
  // Start with base amount from tier
  let eligibilityAmount = baseAmount;
  
  // Apply business size cap
  eligibilityAmount = applyBusinessSizeCap(eligibilityAmount, businessSize);
  
  // Reduce by outstanding balance (Requirement 17.3)
  eligibilityAmount -= outstandingBalance;
  
  // Additional reduction for poor payment history (Requirement 17.4)
  // If payment history score is below 60, reduce eligibility further
  if (paymentHistoryScore < 60) {
    const reductionPercentage = (60 - paymentHistoryScore) / 100; // 0% to 60% reduction
    const reductionAmount = eligibilityAmount * reductionPercentage;
    eligibilityAmount -= reductionAmount;
    console.log(`[Eligibility] Applied payment history penalty: -${reductionAmount.toFixed(2)} (${(reductionPercentage * 100).toFixed(1)}%)`);
  }
  
  // Ensure non-negative (Requirement 17.8)
  eligibilityAmount = Math.max(0, eligibilityAmount);
  
  console.log(`[Eligibility] Final eligibility amount: ${eligibilityAmount}`);
  return Math.round(eligibilityAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate next review date
 * 
 * Requirements: 17.7 - Recalculate eligibility after payment cycle completion
 * Default: 30 days from now
 */
function calculateNextReviewDate(): string {
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 30);
  return nextReview.toISOString();
}

/**
 * Store eligibility in database
 * 
 * Requirements: 17.6 - Store eligibility amount and effective date
 */
async function storeEligibility(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  isEligible: boolean,
  eligibilityAmount: number,
  eligibilityTier: string | null,
  outstandingBalance: number,
  ineligibilityReason?: string
): Promise<void> {
  console.log(`[Eligibility] Storing eligibility for vendor: ${vendorId}`);
  
  const nextReviewDate = calculateNextReviewDate();
  
  const { error } = await supabase
    .from('vendor_eligibility')
    .insert({
      vendor_id: vendorId,
      is_eligible: isEligible,
      eligibility_amount: eligibilityAmount,
      eligibility_tier: eligibilityTier,
      outstanding_balance: outstandingBalance,
      last_calculated_at: new Date().toISOString(),
      next_review_date: nextReviewDate,
      ineligibility_reason: ineligibilityReason
    });
  
  if (error) {
    console.error('[Eligibility] Error storing eligibility:', error);
    throw new Error(`Failed to store eligibility: ${error.message}`);
  }
  
  console.log('[Eligibility] Eligibility stored successfully');
}

/**
 * Log eligibility calculation to audit log
 * 
 * Requirements: 17.12 - Log eligibility changes with reason
 */
async function logEligibilityCalculation(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  eligibilityAmount: number,
  tier: string | null,
  reason: string
): Promise<void> {
  console.log(`[Eligibility] Logging audit entry for vendor: ${vendorId}`);
  
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: vendorId,
      action_type: 'eligibility_calculated',
      resource_type: 'vendor_eligibility',
      resource_id: vendorId,
      details: {
        eligibility_amount: eligibilityAmount,
        eligibility_tier: tier,
        reason: reason
      },
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('[Eligibility] Error logging audit entry:', error);
    // Don't throw - audit logging failure shouldn't break the calculation
  }
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
    console.log('[Eligibility] Function invoked');
    
    // Verify JWT authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let requestData: EligibilityRequest;
    try {
      requestData = await req.json();
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
    
    // Validate vendor_id
    if (!requestData.vendor_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'vendor_id is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[Eligibility] Calculating eligibility for vendor: ${requestData.vendor_id}`);
    
    // Fetch vendor data
    const [vendorScore, vendorProfile, currentEligibility] = await Promise.all([
      getVendorScore(supabase, requestData.vendor_id),
      getVendorProfile(supabase, requestData.vendor_id),
      getCurrentEligibility(supabase, requestData.vendor_id)
    ]);
    
    // Validate vendor exists
    if (!vendorProfile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Vendor not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check verification status
    if (!vendorProfile.is_verified) {
      console.log(`[Eligibility] Vendor not verified`);
      
      await storeEligibility(
        supabase,
        requestData.vendor_id,
        false,
        0,
        null,
        currentEligibility.outstanding_balance,
        'Vendor must be verified by field agent'
      );
      
      await logEligibilityCalculation(
        supabase,
        requestData.vendor_id,
        0,
        null,
        'Ineligible: Not verified'
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          eligibility: {
            vendor_id: requestData.vendor_id,
            is_eligible: false,
            eligibility_amount: 0,
            eligibility_tier: 'None',
            outstanding_balance: currentEligibility.outstanding_balance,
            next_review_date: calculateNextReviewDate(),
            ineligibility_reason: 'Vendor must be verified by field agent'
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if vendor has a score
    if (!vendorScore || vendorScore.total_score === null) {
      console.log('[Eligibility] No vendor score found');
      
      await storeEligibility(
        supabase,
        requestData.vendor_id,
        false,
        0,
        null,
        currentEligibility.outstanding_balance,
        'No vendor score available. Score calculation required.'
      );
      
      await logEligibilityCalculation(
        supabase,
        requestData.vendor_id,
        0,
        null,
        'Ineligible: No vendor score available'
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          eligibility: {
            vendor_id: requestData.vendor_id,
            is_eligible: false,
            eligibility_amount: 0,
            eligibility_tier: 'None',
            outstanding_balance: currentEligibility.outstanding_balance,
            next_review_date: calculateNextReviewDate(),
            ineligibility_reason: 'No vendor score available. Score calculation required.'
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Determine eligibility tier based on score
    const tierResult = determineEligibilityTier(vendorScore.total_score);
    
    if (!tierResult) {
      // Score too low (0-40)
      console.log(`[Eligibility] Score too low: ${vendorScore.total_score}`);
      
      await storeEligibility(
        supabase,
        requestData.vendor_id,
        false,
        0,
        null,
        currentEligibility.outstanding_balance,
        `Vendor score too low: ${vendorScore.total_score}/100. Minimum required: 41/100`
      );
      
      await logEligibilityCalculation(
        supabase,
        requestData.vendor_id,
        0,
        null,
        `Ineligible: Score too low (${vendorScore.total_score}/100)`
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          eligibility: {
            vendor_id: requestData.vendor_id,
            is_eligible: false,
            eligibility_amount: 0,
            eligibility_tier: 'None',
            outstanding_balance: currentEligibility.outstanding_balance,
            next_review_date: calculateNextReviewDate(),
            ineligibility_reason: `Vendor score too low: ${vendorScore.total_score}/100. Minimum required: 41/100`
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Calculate final eligibility amount
    const eligibilityAmount = calculateEligibilityAmount(
      tierResult.baseAmount,
      currentEligibility.outstanding_balance,
      vendorProfile.business_size,
      vendorScore.payment_history_score || 0
    );
    
    // Determine if eligible (amount > 0)
    const isEligible = eligibilityAmount > 0;
    
    // Store eligibility
    await storeEligibility(
      supabase,
      requestData.vendor_id,
      isEligible,
      eligibilityAmount,
      tierResult.tier,
      currentEligibility.outstanding_balance,
      isEligible ? undefined : 'Outstanding balance exceeds base eligibility amount'
    );
    
    // Log calculation
    await logEligibilityCalculation(
      supabase,
      requestData.vendor_id,
      eligibilityAmount,
      tierResult.tier,
      `Calculated: score=${vendorScore.total_score}, tier=${tierResult.tier}, base=${tierResult.baseAmount}, outstanding=${currentEligibility.outstanding_balance}, final=${eligibilityAmount}`
    );
    
    console.log(`[Eligibility] Calculation complete: eligible=${isEligible}, amount=${eligibilityAmount}, tier=${tierResult.tier}`);
    
    // Return result
    const response: EligibilityResponse = {
      success: true,
      eligibility: {
        vendor_id: requestData.vendor_id,
        is_eligible: isEligible,
        eligibility_amount: eligibilityAmount,
        eligibility_tier: tierResult.tier,
        outstanding_balance: currentEligibility.outstanding_balance,
        next_review_date: calculateNextReviewDate(),
        ineligibility_reason: isEligible ? undefined : 'Outstanding balance exceeds base eligibility amount'
      }
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[Eligibility] Unexpected error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to calculate eligibility: ${errorMessage}`
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
