/**
 * Match Supplier Edge Function
 * 
 * This Supabase Edge Function calculates supplier match scores for vendor-supplier pairs
 * based on six weighted components:
 * 1. Product Match (30%) - How well supplier's products match vendor's needs
 * 2. Availability (20%) - Product availability and stock levels
 * 3. Price (20%) - Price competitiveness vs market average
 * 4. Location (15%) - Proximity and delivery coverage
 * 5. Delivery (10%) - Delivery capability and performance
 * 6. Reliability (5%) - Supplier's overall performance score
 * 
 * Requirements:
 * - 10.4: Calculate supplier match scores for vendor-supplier pairs
 * - 16.7: Implement matching algorithm with 6 components
 * - 16.8: Calculate product match, availability, price, location, delivery, reliability
 * - 16.9: Store matches in supplier_matches table
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Match supplier request interface
 */
interface MatchSupplierRequest {
  vendorId: string;
  requestedProducts?: string[];  // Optional: specific product IDs to match against
}

/**
 * Supplier match result interface
 */
interface SupplierMatch {
  supplierId: string;
  supplierName: string;
  matchScore: number;
  components: {
    productMatch: number;
    availability: number;
    price: number;
    location: number;
    delivery: number;
    reliability: number;
  };
}

/**
 * Match supplier response interface
 */
interface MatchSupplierResponse {
  success: boolean;
  vendorId?: string;
  matches?: SupplierMatch[];
  error?: string;
}

/**
 * Component weights
 * Requirements: 16.7 - Matching algorithm component weights
 */
const WEIGHTS = {
  PRODUCT_MATCH: 0.30,     // 30%
  AVAILABILITY: 0.20,      // 20%
  PRICE: 0.20,             // 20%
  LOCATION: 0.15,          // 15%
  DELIVERY: 0.10,          // 10%
  RELIABILITY: 0.05        // 5%
};

/**
 * Extract region from location string
 * Simple heuristic - checks for common Kenyan counties/regions
 */
function extractRegion(location: string): string {
  const regions = [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
    'Thika', 'Kitale', 'Malindi', 'Machakos', 'Kiambu',
    'Nyeri', 'Meru', 'Kakamega', 'Bungoma', 'Kisii'
  ];
  
  const lowerLocation = location.toLowerCase();
  
  for (const region of regions) {
    if (lowerLocation.includes(region.toLowerCase())) {
      return region;
    }
  }
  
  return 'Other';
}

/**
 * Calculate product match score (0-100)
 * 
 * Based on how many of the vendor's requested products the supplier can provide.
 * Higher match percentage = higher score.
 * 
 * Requirements: 16.8 - Calculate product match component
 * 
 * @param supabase - Supabase client
 * @param supplierId - Supplier UUID
 * @param requestedProducts - Array of product IDs vendor needs
 * @returns Promise<number> Score from 0-100
 */
async function calculateProductMatchScore(
  supabase: ReturnType<typeof createClient>,
  supplierId: string,
  requestedProducts: string[]
): Promise<number> {
  if (!requestedProducts || requestedProducts.length === 0) {
    // If no specific products requested, check overall catalog overlap
    // This is a fallback - in production, you'd want more context
    return 50; // Neutral score
  }
  
  // Query supplier's products that match the requested products
  const { data: matchingProducts, error } = await supabase
    .from('supplier_products')
    .select('product_id')
    .eq('supplier_id', supplierId)
    .in('product_id', requestedProducts)
    .eq('is_active', true)
    .in('availability_status', ['available', 'in_stock', 'limited']);
  
  if (error) {
    console.error('[Match Supplier] Error querying product match:', error);
    return 0;
  }
  
  const matchCount = matchingProducts?.length || 0;
  const matchRate = matchCount / requestedProducts.length;
  
  const score = matchRate * 100;
  
  console.log(`[Match Supplier] Product match: ${matchCount}/${requestedProducts.length} products = ${score.toFixed(2)}`);
  
  return score;
}

/**
 * Calculate availability score (0-100)
 * 
 * Based on how much of the requested inventory is actually in stock.
 * Checks inventory levels for matched products.
 * 
 * Requirements: 16.8 - Calculate availability component
 * 
 * @param supabase - Supabase client
 * @param supplierId - Supplier UUID
 * @param requestedProducts - Array of product IDs vendor needs
 * @returns Promise<number> Score from 0-100
 */
async function calculateAvailabilityScore(
  supabase: ReturnType<typeof createClient>,
  supplierId: string,
  requestedProducts: string[]
): Promise<number> {
  if (!requestedProducts || requestedProducts.length === 0) {
    // Check overall inventory availability
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('available_quantity, supplier_products!inner(supplier_id)')
      .eq('supplier_products.supplier_id', supplierId);
    
    if (error || !inventory || inventory.length === 0) {
      return 50; // Neutral score for no data
    }
    
    const inStockCount = inventory.filter(inv => Number(inv.available_quantity) > 0).length;
    return (inStockCount / inventory.length) * 100;
  }
  
  // Query inventory for requested products
  const { data: inventory, error } = await supabase
    .from('inventory')
    .select('available_quantity, supplier_products!inner(product_id, supplier_id)')
    .eq('supplier_products.supplier_id', supplierId)
    .in('supplier_products.product_id', requestedProducts);
  
  if (error) {
    console.error('[Match Supplier] Error querying availability:', error);
    return 0;
  }
  
  if (!inventory || inventory.length === 0) {
    return 0; // No inventory data = no availability
  }
  
  // Calculate what percentage of products have stock
  const inStockCount = inventory.filter(inv => Number(inv.available_quantity) > 0).length;
  const score = (inStockCount / requestedProducts.length) * 100;
  
  console.log(`[Match Supplier] Availability: ${inStockCount}/${requestedProducts.length} in stock = ${score.toFixed(2)}`);
  
  return score;
}

/**
 * Calculate price competitiveness score (0-100)
 * 
 * Compares supplier's prices to market average.
 * Lower than average = higher score.
 * 
 * Requirements: 16.8 - Calculate price component
 * 
 * @param supabase - Supabase client
 * @param supplierId - Supplier UUID
 * @param requestedProducts - Array of product IDs vendor needs
 * @returns Promise<number> Score from 0-100
 */
async function calculatePriceScore(
  supabase: ReturnType<typeof createClient>,
  supplierId: string,
  requestedProducts: string[]
): Promise<number> {
  if (!requestedProducts || requestedProducts.length === 0) {
    return 50; // Neutral score without specific products
  }
  
  // Get supplier's prices for requested products
  const { data: supplierPrices, error: supplierError } = await supabase
    .from('supplier_products')
    .select('unit_price, product_id')
    .eq('supplier_id', supplierId)
    .in('product_id', requestedProducts)
    .eq('is_active', true);
  
  if (supplierError || !supplierPrices || supplierPrices.length === 0) {
    console.error('[Match Supplier] Error querying supplier prices:', supplierError);
    return 50; // Neutral score
  }
  
  // Get market average prices for the same products
  const { data: marketPrices, error: marketError } = await supabase
    .from('supplier_products')
    .select('unit_price, product_id')
    .in('product_id', requestedProducts)
    .eq('is_active', true);
  
  if (marketError || !marketPrices || marketPrices.length === 0) {
    console.error('[Match Supplier] Error querying market prices:', marketError);
    return 50; // Neutral score
  }
  
  // Calculate average supplier price
  const avgSupplierPrice = supplierPrices.reduce((sum, p) => sum + Number(p.unit_price), 0) / supplierPrices.length;
  
  // Calculate average market price
  const avgMarketPrice = marketPrices.reduce((sum, p) => sum + Number(p.unit_price), 0) / marketPrices.length;
  
  if (avgMarketPrice === 0) {
    return 50; // Neutral if no market data
  }
  
  // Calculate price difference percentage
  const priceDiff = (avgSupplierPrice - avgMarketPrice) / avgMarketPrice;
  
  // Scoring: 10% below market = 100, at market = 75, 10% above = 50, 20%+ above = 0
  let score: number;
  
  if (priceDiff <= -0.10) {
    score = 100; // 10% or more below market
  } else if (priceDiff < 0) {
    score = 75 + (Math.abs(priceDiff) * 250); // Between 0% and 10% below (75-100)
  } else if (priceDiff === 0) {
    score = 75; // Exactly at market
  } else if (priceDiff <= 0.10) {
    score = 75 - (priceDiff * 250); // Between 0% and 10% above (50-75)
  } else if (priceDiff <= 0.20) {
    score = 50 - ((priceDiff - 0.10) * 500); // Between 10% and 20% above (0-50)
  } else {
    score = 0; // More than 20% above market
  }
  
  console.log(`[Match Supplier] Price: Supplier avg ${avgSupplierPrice.toFixed(2)} vs Market avg ${avgMarketPrice.toFixed(2)} (${(priceDiff * 100).toFixed(1)}%) = ${score.toFixed(2)}`);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate location proximity score (0-100)
 * 
 * Based on whether supplier is in same region as vendor and can deliver.
 * Same region = higher score.
 * 
 * Requirements: 16.8 - Calculate location component
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @param supplierId - Supplier UUID
 * @returns Promise<number> Score from 0-100
 */
async function calculateLocationScore(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  supplierId: string
): Promise<number> {
  // Get vendor location
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('physical_location')
    .eq('id', vendorId)
    .single();
  
  if (vendorError || !vendor) {
    console.error('[Match Supplier] Error querying vendor location:', vendorError);
    return 50; // Neutral score
  }
  
  // Get supplier location and coverage
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .select('physical_address, coverage_areas')
    .eq('id', supplierId)
    .single();
  
  if (supplierError || !supplier) {
    console.error('[Match Supplier] Error querying supplier location:', supplierError);
    return 50; // Neutral score
  }
  
  const vendorRegion = extractRegion(vendor.physical_location);
  const supplierRegion = extractRegion(supplier.physical_address);
  
  // Check if same region
  const sameRegion = vendorRegion === supplierRegion;
  
  // Check if supplier covers vendor's area
  const coverageAreas = supplier.coverage_areas || [];
  const coversArea = coverageAreas.some((area: string) => 
    vendorRegion.toLowerCase() === area.toLowerCase() ||
    vendor.physical_location.toLowerCase().includes(area.toLowerCase())
  );
  
  let score: number;
  
  if (sameRegion && coversArea) {
    score = 100; // Same region and explicitly covers area
  } else if (sameRegion) {
    score = 85; // Same region but not in coverage list
  } else if (coversArea) {
    score = 70; // Different region but covers area
  } else {
    score = 30; // Different region and doesn't cover area
  }
  
  console.log(`[Match Supplier] Location: Vendor in ${vendorRegion}, Supplier in ${supplierRegion}, Covers: ${coversArea} = ${score.toFixed(2)}`);
  
  return score;
}

/**
 * Calculate delivery capability score (0-100)
 * 
 * Based on supplier's delivery performance history and lead times.
 * Better delivery record = higher score.
 * 
 * Requirements: 16.8 - Calculate delivery component
 * 
 * @param supabase - Supabase client
 * @param supplierId - Supplier UUID
 * @returns Promise<number> Score from 0-100
 */
async function calculateDeliveryScore(
  supabase: ReturnType<typeof createClient>,
  supplierId: string
): Promise<number> {
  // Query delivery performance
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('delivery_status, estimated_delivery_date, actual_delivery_date')
    .eq('supplier_id', supplierId);
  
  if (error) {
    console.error('[Match Supplier] Error querying deliveries:', error);
    return 50; // Neutral score
  }
  
  if (!deliveries || deliveries.length === 0) {
    // No history = neutral score for new suppliers
    return 50;
  }
  
  const totalDeliveries = deliveries.length;
  
  // Calculate completion rate
  const completedDeliveries = deliveries.filter(d => d.delivery_status === 'delivered').length;
  const completionRate = completedDeliveries / totalDeliveries;
  
  // Calculate on-time delivery rate
  let onTimeCount = 0;
  let deliveriesWithDates = 0;
  
  for (const delivery of deliveries) {
    if (delivery.delivery_status === 'delivered' && delivery.actual_delivery_date && delivery.estimated_delivery_date) {
      deliveriesWithDates++;
      const actualDate = new Date(delivery.actual_delivery_date);
      const estimatedDate = new Date(delivery.estimated_delivery_date);
      
      if (actualDate <= estimatedDate) {
        onTimeCount++;
      }
    }
  }
  
  const onTimeRate = deliveriesWithDates > 0 ? onTimeCount / deliveriesWithDates : 0.5;
  
  // Combined score: 60% completion rate + 40% on-time rate
  const score = (completionRate * 60) + (onTimeRate * 40);
  
  console.log(`[Match Supplier] Delivery: ${completedDeliveries}/${totalDeliveries} completed, ${onTimeCount}/${deliveriesWithDates} on-time = ${score.toFixed(2)}`);
  
  return score * 100;
}

/**
 * Calculate reliability score (0-100)
 * 
 * Based on supplier's overall performance score from supplier_scores table.
 * 
 * Requirements: 16.8 - Calculate reliability component
 * 
 * @param supabase - Supabase client
 * @param supplierId - Supplier UUID
 * @returns Promise<number> Score from 0-100
 */
async function calculateReliabilityScore(
  supabase: ReturnType<typeof createClient>,
  supplierId: string
): Promise<number> {
  // Get latest supplier score
  const { data: supplierScore, error } = await supabase
    .from('supplier_scores')
    .select('score_value')
    .eq('supplier_id', supplierId)
    .order('calculation_date', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !supplierScore) {
    console.log('[Match Supplier] No supplier score found, using neutral reliability');
    return 50; // Neutral score for suppliers without score
  }
  
  const score = Number(supplierScore.score_value);
  
  console.log(`[Match Supplier] Reliability: Supplier score ${score.toFixed(2)}`);
  
  return score;
}

/**
 * Calculate composite match score for a vendor-supplier pair
 * 
 * Requirements:
 * - 10.4: Calculate supplier match scores
 * - 16.7: Apply weights to component scores
 * - 16.8: Calculate all 6 components
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @param supplierId - Supplier UUID
 * @param requestedProducts - Optional array of product IDs
 * @returns Promise<SupplierMatch | null>
 */
async function calculateSupplierMatch(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  supplierId: string,
  supplierName: string,
  requestedProducts: string[] = []
): Promise<SupplierMatch | null> {
  console.log(`[Match Supplier] Calculating match for vendor ${vendorId} with supplier ${supplierId}`);
  
  try {
    // Calculate all component scores in parallel
    const [
      productMatchScore,
      availabilityScore,
      priceScore,
      locationScore,
      deliveryScore,
      reliabilityScore
    ] = await Promise.all([
      calculateProductMatchScore(supabase, supplierId, requestedProducts),
      calculateAvailabilityScore(supabase, supplierId, requestedProducts),
      calculatePriceScore(supabase, supplierId, requestedProducts),
      calculateLocationScore(supabase, vendorId, supplierId),
      calculateDeliveryScore(supabase, supplierId),
      calculateReliabilityScore(supabase, supplierId)
    ]);
    
    // Calculate weighted total match score
    const matchScore =
      (productMatchScore * WEIGHTS.PRODUCT_MATCH) +
      (availabilityScore * WEIGHTS.AVAILABILITY) +
      (priceScore * WEIGHTS.PRICE) +
      (locationScore * WEIGHTS.LOCATION) +
      (deliveryScore * WEIGHTS.DELIVERY) +
      (reliabilityScore * WEIGHTS.RELIABILITY);
    
    const roundedScore = Math.round(matchScore * 100) / 100;
    
    console.log(`[Match Supplier] Total match score: ${roundedScore}`);
    
    return {
      supplierId,
      supplierName,
      matchScore: roundedScore,
      components: {
        productMatch: Math.round(productMatchScore * 100) / 100,
        availability: Math.round(availabilityScore * 100) / 100,
        price: Math.round(priceScore * 100) / 100,
        location: Math.round(locationScore * 100) / 100,
        delivery: Math.round(deliveryScore * 100) / 100,
        reliability: Math.round(reliabilityScore * 100) / 100
      }
    };
  } catch (error) {
    console.error(`[Match Supplier] Error calculating match for supplier ${supplierId}:`, error);
    return null;
  }
}

/**
 * Store supplier matches in database
 * 
 * Requirements: 16.9 - Store matches in supplier_matches table
 * 
 * @param supabase - Supabase client
 * @param vendorId - Vendor UUID
 * @param matches - Array of supplier matches
 */
async function storeSupplierMatches(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  matches: SupplierMatch[]
): Promise<void> {
  console.log(`[Match Supplier] Storing ${matches.length} matches for vendor ${vendorId}`);
  
  const matchRecords = matches.map(match => ({
    vendor_id: vendorId,
    supplier_id: match.supplierId,
    match_score: match.matchScore,
    product_match_score: match.components.productMatch,
    availability_score: match.components.availability,
    price_score: match.components.price,
    location_score: match.components.location,
    delivery_score: match.components.delivery,
    reliability_score: match.components.reliability,
    calculation_date: new Date().toISOString()
  }));
  
  const { error } = await supabase
    .from('supplier_matches')
    .insert(matchRecords);
  
  if (error) {
    console.error('[Match Supplier] Error storing matches:', error);
    throw new Error(`Failed to store matches: ${error.message}`);
  }
  
  console.log('[Match Supplier] Matches stored successfully');
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
    console.log('[Match Supplier] Function invoked');
    
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let requestData: MatchSupplierRequest;
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
    
    console.log(`[Match Supplier] Matching suppliers for vendor: ${requestData.vendorId}`);
    
    // Verify vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, business_name')
      .eq('id', requestData.vendorId)
      .single();
    
    if (vendorError || !vendor) {
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
    
    // Get all active, approved suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, business_name')
      .eq('is_active', true)
      .eq('approval_status', 'approved');
    
    if (suppliersError) {
      console.error('[Match Supplier] Error fetching suppliers:', suppliersError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch suppliers'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!suppliers || suppliers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          vendorId: requestData.vendorId,
          matches: []
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[Match Supplier] Found ${suppliers.length} active suppliers`);
    
    // Calculate matches for all suppliers
    const matchPromises = suppliers.map(supplier =>
      calculateSupplierMatch(
        supabase,
        requestData.vendorId,
        supplier.id,
        supplier.business_name,
        requestData.requestedProducts || []
      )
    );
    
    const matchResults = await Promise.all(matchPromises);
    
    // Filter out null results and sort by match score descending
    const validMatches = matchResults
      .filter((match): match is SupplierMatch => match !== null)
      .sort((a, b) => b.matchScore - a.matchScore);
    
    console.log(`[Match Supplier] Calculated ${validMatches.length} valid matches`);
    
    // Store matches in database
    if (validMatches.length > 0) {
      await storeSupplierMatches(supabase, requestData.vendorId, validMatches);
    }
    
    // Log to audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        user_id: requestData.vendorId,
        action_type: 'supplier_matches_calculated',
        resource_type: 'supplier_match',
        resource_id: requestData.vendorId,
        action_status: 'success',
        details: {
          matches_count: validMatches.length,
          top_match_score: validMatches.length > 0 ? validMatches[0].matchScore : null
        }
      });
    
    console.log('[Match Supplier] Matching complete');
    
    // Return results
    const response: MatchSupplierResponse = {
      success: true,
      vendorId: requestData.vendorId,
      matches: validMatches
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[Match Supplier] Unexpected error:', error);
    
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
