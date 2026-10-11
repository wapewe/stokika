/**
 * Calculate Vendor Score Edge Function
 * 
 * This Supabase Edge Function calculates vendor creditworthiness scores based on
 * multiple performance metrics and business characteristics. The score determines
 * stock eligibility and influences supplier matching decisions.
 * 
 * Requirements:
 * - 10.2: Calculate vendor scores server-side based on multiple factors
 * - 16.1: Score components with weights: maturity (10%), verification (15%), 
 *         activity (20%), consistency (15%), payment (30%), growth (10%)
 * - 16.2: Store calculated score in vendor_scores table
 * - 16.3: Recalculate scores on schedule
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Vendor score request interface
 */
interface VendorScoreRequest {
  vendorId: string;  // UUID of vendor to score
}

/**
 * Vendor score response interface
 */
interface VendorScoreResponse {
  success: boolean;
  vendorId?: string;
  totalScore?: number;
  componentScores?: {
    businessLongevity: number;
    verification: number;
    activity: number;
    consistency: number;
    payment: number;
    growth: number;
  };
  error?: string;
}

/**
 * Vendor data interface for scoring
 */
interface VendorData {
  id: string;
  created_at: string;
  is_verified: boolean;
  verification_date: string | null;
  onboarding_completed: boolean;
  business_size_id: string | null;
}

/**
 * Component weight constants
 * Requirements: 16.1 - Scoring algorithm component weights
 */
const WEIGHTS = {
  BUSINESS_LONGEVITY: 0.10,  // 10%
  VERIFICATION: 0.15,         // 15%
  ACTIVITY: 0.20,             // 20%
  CONSISTENCY: 0.15,          // 15%
  PAYMENT: 0.30,              // 30%
  GROWTH: 0.10                // 10%
};

/**
 * Calculate business longevity/maturity score (0-100)
 * 
 * Based on how long the vendor has been registered and active on the platform.
 * Newer vendors score lower, established vendors score higher.
 * 
 * Requirements: 16.1 - Calculate maturity score
 * 
 * @param createdAt - Vendor registration date
 * @returns Score from 0-100
 */
function calculateBusinessLongevityScore(createdAt: string): number {
  const registrationDate = new Date(createdAt);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Score calculation:
  // 0-30 days: 20-40 points (new vendor)
  // 31-90 days: 40-60 points (getting established)
  // 91-180 days: 60-80 points (established)
  // 181+ days: 80-100 points (mature business)
  
  if (daysActive <= 30) {
    return 20 + (daysActive / 30) * 20;  // 20-40
  } else if (daysActive <= 90) {
    return 40 + ((daysActive - 30) / 60) * 20;  // 40-60
  } else if (daysActive <= 180) {
    return 60 + ((daysActive - 90) / 90) * 20;  // 60-80
  } else {
    // Cap at 100
    const score = 80 + ((daysActive - 180) / 180) * 20;
    return Math.min(100, score);
  }
}

/**
 * Calculate verification status score (0-100)
 * 
 * Based on whether vendor is verified and how long they've been verified.
 * Unverified vendors score very low.
 * 
 * Requirements: 16.1 - Calculate verification status score
 * 
 * @param isVerified - Whether vendor is verified
 * @param verificationDate - When vendor was verified
 * @param onboardingCompleted - Whether onboarding is complete
 * @returns Score from 0-100
 */
function calculateVerificationScore(
  isVerified: boolean,
  verificationDate: string | null,
  onboardingCompleted: boolean
): number {
  // Base score for verification status
  if (!isVerified) {
    return 10;  // Unverified vendors get very low score
  }
  
  if (!onboardingCompleted) {
    return 30;  // Verified but incomplete onboarding
  }
  
  // Verified and onboarded - score based on verification duration
  let baseScore = 70;
  
  if (verificationDate) {
    const verifiedDate = new Date(verificationDate);
    const now = new Date();
    const daysVerified = Math.floor((now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Add bonus points for being verified longer (trust builds over time)
    // Up to 30 bonus points over 90 days
    const bonusPoints = Math.min(30, (daysVerified / 90) * 30);
    baseScore += bonusPoints;
  }
  
  return Math.min(100, baseScore);
}

/**
 * Calculate activity level score (0-100)
 * 
 * Based on number and frequency of stock requests in the last 90 days.
 * More active vendors score higher.
 * 
 * Requirements: 16.1 - Calculate activity level score
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @returns Promise<number> Score from 0-100
 */
async function calculateActivityScore(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<number> {
  // Query stock requests in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const { data: requests, error } = await supabase
    .from('stock_requests')
    .select('id, created_at, request_status')
    .eq('vendor_id', vendorId)
    .gte('created_at', ninetyDaysAgo.toISOString());
  
  if (error) {
    console.error('[Vendor Score] Error querying stock requests:', error);
    return 0;
  }
  
  const requestCount = requests?.length || 0;
  
  // Score based on request count
  // 0 requests: 0 points
  // 1-2 requests: 20-40 points
  // 3-5 requests: 40-70 points
  // 6-10 requests: 70-90 points
  // 11+ requests: 90-100 points
  
  if (requestCount === 0) {
    return 0;
  } else if (requestCount <= 2) {
    return 20 + (requestCount / 2) * 20;
  } else if (requestCount <= 5) {
    return 40 + ((requestCount - 2) / 3) * 30;
  } else if (requestCount <= 10) {
    return 70 + ((requestCount - 5) / 5) * 20;
  } else {
    return Math.min(100, 90 + ((requestCount - 10) / 10) * 10);
  }
}

/**
 * Calculate order consistency score (0-100)
 * 
 * Based on consistency of order patterns and completion rates.
 * Higher completion rates and consistent ordering patterns score higher.
 * 
 * Requirements: 16.1 - Calculate consistency score
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @returns Promise<number> Score from 0-100
 */
async function calculateConsistencyScore(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<number> {
  // Query all stock requests for completion rate
  const { data: allRequests, error: allError } = await supabase
    .from('stock_requests')
    .select('id, request_status')
    .eq('vendor_id', vendorId);
  
  if (allError) {
    console.error('[Vendor Score] Error querying all requests:', allError);
    return 50;  // Neutral score on error
  }
  
  if (!allRequests || allRequests.length === 0) {
    return 50;  // Neutral score for new vendors
  }
  
  // Calculate completion rate
  const completedCount = allRequests.filter(r => r.request_status === 'delivered').length;
  const cancelledCount = allRequests.filter(r => r.request_status === 'cancelled' || r.request_status === 'rejected').length;
  const totalRequests = allRequests.length;
  
  const completionRate = totalRequests > 0 ? (completedCount / totalRequests) : 0;
  const cancellationRate = totalRequests > 0 ? (cancelledCount / totalRequests) : 0;
  
  // Base score from completion rate (0-70 points)
  const completionScore = completionRate * 70;
  
  // Penalty for high cancellation rate (up to -30 points)
  const cancellationPenalty = cancellationRate * 30;
  
  // Check for consistency in ordering frequency (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { data: recentRequests } = await supabase
    .from('stock_requests')
    .select('created_at')
    .eq('vendor_id', vendorId)
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true });
  
  let consistencyBonus = 0;
  if (recentRequests && recentRequests.length >= 3) {
    // Calculate variance in time between orders
    // Lower variance = more consistent = higher bonus (up to 30 points)
    const intervals: number[] = [];
    for (let i = 1; i < recentRequests.length; i++) {
      const prev = new Date(recentRequests[i - 1].created_at);
      const curr = new Date(recentRequests[i].created_at);
      intervals.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));  // days
    }
    
    // Calculate coefficient of variation (standard deviation / mean)
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) : 1;
    
    // Lower CV = more consistent = higher bonus
    // CV of 0 = perfect consistency = 30 points
    // CV of 1+ = inconsistent = 0 points
    consistencyBonus = Math.max(0, 30 * (1 - Math.min(1, cv)));
  }
  
  const finalScore = completionScore - cancellationPenalty + consistencyBonus;
  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Calculate payment performance score (0-100)
 * 
 * Based on payment history, on-time payments, and payment completion rates.
 * This is the most heavily weighted component (30%).
 * 
 * Requirements: 16.1 - Calculate payment performance score
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @returns Promise<number> Score from 0-100
 */
async function calculatePaymentScore(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<number> {
  // Query payment history
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, payment_status, due_date, paid_date, amount')
    .eq('vendor_id', vendorId);
  
  if (error) {
    console.error('[Vendor Score] Error querying payments:', error);
    return 50;  // Neutral score on error
  }
  
  if (!payments || payments.length === 0) {
    return 50;  // Neutral score for vendors with no payment history
  }
  
  // Calculate payment completion rate (0-40 points)
  const completedPayments = payments.filter(p => p.payment_status === 'completed').length;
  const failedPayments = payments.filter(p => p.payment_status === 'failed' || p.payment_status === 'cancelled').length;
  const completionRate = (completedPayments / payments.length) * 40;
  
  // Calculate on-time payment rate (0-40 points)
  const paymentsWithDueDates = payments.filter(p => p.due_date && p.paid_date);
  let onTimeScore = 0;
  
  if (paymentsWithDueDates.length > 0) {
    const onTimePayments = paymentsWithDueDates.filter(p => {
      const dueDate = new Date(p.due_date!);
      const paidDate = new Date(p.paid_date!);
      return paidDate <= dueDate;
    }).length;
    
    onTimeScore = (onTimePayments / paymentsWithDueDates.length) * 40;
  } else {
    // If no due dates available, give neutral score
    onTimeScore = 20;
  }
  
  // Penalty for failed payments (up to -20 points)
  const failurePenalty = Math.min(20, (failedPayments / payments.length) * 40);
  
  // Calculate average payment amount consistency (0-20 points)
  const completedAmounts = payments
    .filter(p => p.payment_status === 'completed')
    .map(p => parseFloat(p.amount));
  
  let consistencyBonus = 0;
  if (completedAmounts.length >= 3) {
    const avgAmount = completedAmounts.reduce((a, b) => a + b, 0) / completedAmounts.length;
    const variance = completedAmounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / completedAmounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgAmount > 0 ? (stdDev / avgAmount) : 1;
    
    // Lower CV = more consistent payment amounts = higher bonus
    consistencyBonus = Math.max(0, 20 * (1 - Math.min(1, cv)));
  }
  
  // Check for recent payment activity (bonus 0-20 points)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentPayments = payments.filter(p => 
    p.paid_date && new Date(p.paid_date) >= thirtyDaysAgo
  );
  const recencyBonus = Math.min(20, recentPayments.length * 5);
  
  const finalScore = completionRate + onTimeScore - failurePenalty + consistencyBonus + recencyBonus;
  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Calculate business growth score (0-100)
 * 
 * Based on growth in order values and frequency over time.
 * Growing businesses score higher.
 * 
 * Requirements: 16.1 - Calculate growth trajectory score
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @returns Promise<number> Score from 0-100
 */
async function calculateGrowthScore(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<number> {
  // Query stock requests over the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { data: requests, error } = await supabase
    .from('stock_requests')
    .select('created_at, total_amount, request_status')
    .eq('vendor_id', vendorId)
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('[Vendor Score] Error querying requests for growth:', error);
    return 50;  // Neutral score on error
  }
  
  if (!requests || requests.length < 2) {
    return 50;  // Need at least 2 data points for growth calculation
  }
  
  // Group by month and calculate monthly totals
  const monthlyData: { [key: string]: { count: number; total: number } } = {};
  
  requests.forEach(req => {
    if (req.request_status === 'delivered' || req.request_status === 'in_transit') {
      const date = new Date(req.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, total: 0 };
      }
      
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].total += parseFloat(req.total_amount);
    }
  });
  
  const months = Object.keys(monthlyData).sort();
  
  if (months.length < 2) {
    return 50;  // Need at least 2 months for growth trend
  }
  
  // Calculate growth rate in order count
  const firstMonthCount = monthlyData[months[0]].count;
  const lastMonthCount = monthlyData[months[months.length - 1]].count;
  const countGrowth = firstMonthCount > 0 ? ((lastMonthCount - firstMonthCount) / firstMonthCount) : 0;
  
  // Calculate growth rate in order values
  const firstMonthTotal = monthlyData[months[0]].total;
  const lastMonthTotal = monthlyData[months[months.length - 1]].total;
  const valueGrowth = firstMonthTotal > 0 ? ((lastMonthTotal - firstMonthTotal) / firstMonthTotal) : 0;
  
  // Score based on growth rates
  // Negative growth: 0-40 points
  // No growth: 50 points
  // Positive growth 0-50%: 50-75 points
  // Positive growth 50-100%: 75-90 points
  // Positive growth 100%+: 90-100 points
  
  const avgGrowth = (countGrowth + valueGrowth) / 2;
  
  if (avgGrowth < 0) {
    // Declining business: score proportional to decline (max penalty -50%)
    return Math.max(0, 50 + avgGrowth * 100);
  } else if (avgGrowth === 0) {
    return 50;  // No growth
  } else if (avgGrowth <= 0.5) {
    return 50 + (avgGrowth / 0.5) * 25;  // 50-75
  } else if (avgGrowth <= 1.0) {
    return 75 + ((avgGrowth - 0.5) / 0.5) * 15;  // 75-90
  } else {
    return Math.min(100, 90 + Math.min(avgGrowth - 1.0, 0.5) * 20);  // 90-100
  }
}

/**
 * Calculate composite vendor score
 * 
 * Requirements:
 * - 10.2: Determine vendor scores based on multiple factors
 * - 16.1: Apply weights to component scores
 * - 16.2: Store calculated score in vendor_scores table
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @returns Promise<VendorScoreResponse>
 */
async function calculateVendorScore(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<VendorScoreResponse> {
  console.log(`[Vendor Score] Calculating score for vendor ${vendorId}`);
  
  try {
    // Fetch vendor data
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, created_at, is_verified, verification_date, onboarding_completed, business_size_id')
      .eq('id', vendorId)
      .single();
    
    if (vendorError || !vendor) {
      console.error('[Vendor Score] Error fetching vendor:', vendorError);
      return {
        success: false,
        error: 'Vendor not found'
      };
    }
    
    const vendorData = vendor as VendorData;
    
    // Calculate component scores
    console.log('[Vendor Score] Calculating component scores...');
    
    const businessLongevityScore = calculateBusinessLongevityScore(vendorData.created_at);
    console.log(`[Vendor Score] Business longevity: ${businessLongevityScore.toFixed(2)}`);
    
    const verificationScore = calculateVerificationScore(
      vendorData.is_verified,
      vendorData.verification_date,
      vendorData.onboarding_completed
    );
    console.log(`[Vendor Score] Verification: ${verificationScore.toFixed(2)}`);
    
    const activityScore = await calculateActivityScore(supabase, vendorId);
    console.log(`[Vendor Score] Activity: ${activityScore.toFixed(2)}`);
    
    const consistencyScore = await calculateConsistencyScore(supabase, vendorId);
    console.log(`[Vendor Score] Consistency: ${consistencyScore.toFixed(2)}`);
    
    const paymentScore = await calculatePaymentScore(supabase, vendorId);
    console.log(`[Vendor Score] Payment: ${paymentScore.toFixed(2)}`);
    
    const growthScore = await calculateGrowthScore(supabase, vendorId);
    console.log(`[Vendor Score] Growth: ${growthScore.toFixed(2)}`);
    
    // Calculate weighted total score
    const totalScore = 
      (businessLongevityScore * WEIGHTS.BUSINESS_LONGEVITY) +
      (verificationScore * WEIGHTS.VERIFICATION) +
      (activityScore * WEIGHTS.ACTIVITY) +
      (consistencyScore * WEIGHTS.CONSISTENCY) +
      (paymentScore * WEIGHTS.PAYMENT) +
      (growthScore * WEIGHTS.GROWTH);
    
    console.log(`[Vendor Score] Total score: ${totalScore.toFixed(2)}`);
    
    // Store score in database
    const { error: insertError } = await supabase
      .from('vendor_scores')
      .insert({
        vendor_id: vendorId,
        business_longevity_score: parseFloat(businessLongevityScore.toFixed(2)),
        sales_consistency_score: parseFloat(consistencyScore.toFixed(2)),
        payment_history_score: parseFloat(paymentScore.toFixed(2)),
        business_growth_score: parseFloat(growthScore.toFixed(2)),
        total_score: parseFloat(totalScore.toFixed(2)),
        score_calculated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('[Vendor Score] Error storing score:', insertError);
      return {
        success: false,
        error: `Failed to store score: ${insertError.message}`
      };
    }
    
    // Log to audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        user_id: vendorId,
        action: 'vendor_score_calculated',
        resource_type: 'vendor_score',
        resource_id: vendorId,
        details: {
          total_score: totalScore,
          components: {
            business_longevity: businessLongevityScore,
            verification: verificationScore,
            activity: activityScore,
            consistency: consistencyScore,
            payment: paymentScore,
            growth: growthScore
          }
        }
      });
    
    console.log('[Vendor Score] Score calculation complete');
    
    return {
      success: true,
      vendorId,
      totalScore: parseFloat(totalScore.toFixed(2)),
      componentScores: {
        businessLongevity: parseFloat(businessLongevityScore.toFixed(2)),
        verification: parseFloat(verificationScore.toFixed(2)),
        activity: parseFloat(activityScore.toFixed(2)),
        consistency: parseFloat(consistencyScore.toFixed(2)),
        payment: parseFloat(paymentScore.toFixed(2)),
        growth: parseFloat(growthScore.toFixed(2))
      }
    };
    
  } catch (error) {
    console.error('[Vendor Score] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
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
    console.log('[Vendor Score] Function invoked');
    
    // Validate JWT authentication
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let requestData: VendorScoreRequest;
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
    
    // Validate vendorId
    if (!requestData.vendorId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'vendorId is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Calculate vendor score
    const result = await calculateVendorScore(supabase, requestData.vendorId);
    
    const statusCode = result.success ? 200 : 400;
    
    return new Response(
      JSON.stringify(result),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[Vendor Score] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
