/**
 * Calculate Supplier Score Edge Function
 * 
 * This Edge Function calculates a comprehensive performance score for suppliers
 * based on five key components:
 * 1. Order Fulfillment Rate (25%)
 * 2. Delivery Timeliness (25%)
 * 3. Product Availability (20%)
 * 4. Product Quality (15%)
 * 5. Price Competitiveness (15%)
 * 
 * Requirements:
 * - 10.3: Determine supplier scores based on fulfillment, delivery, availability, and quality
 * - 16.4: Calculate supplier score with 5 weighted components
 * - 16.5: Store calculated score in supplier_scores table
 * - 16.6: Recalculate supplier scores daily via scheduled function
 */

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Supplier score components (all 0-100)
 */
interface SupplierScoreComponents {
  fulfillment: number;    // Order fulfillment rate
  delivery: number;       // Delivery timeliness
  availability: number;   // Product availability
  quality: number;        // Product quality based on feedback
  price: number;          // Price competitiveness
}

/**
 * Supplier score calculation result
 */
interface SupplierScoreResult {
  score: number;
  components: SupplierScoreComponents;
}

/**
 * Calculate supplier score based on performance metrics
 * 
 * @param supabase - Supabase client with service role privileges
 * @param supplierId - UUID of the supplier to score
 * @returns Promise<SupplierScoreResult> - Calculated score and component breakdown
 */
async function calculateSupplierScore(
  supabase: ReturnType<typeof createClient>,
  supplierId: string
): Promise<SupplierScoreResult> {
  
  console.log(`[Supplier Score] Calculating score for supplier ${supplierId}`);
  
  // Component 1: Order Fulfillment Rate (25%)
  // Percentage of orders successfully fulfilled vs cancelled/failed
  const { data: orderStats, error: orderError } = await supabase
    .from('stock_orders')
    .select('order_status')
    .eq('supplier_id', supplierId);
  
  let fulfillmentScore = 50; // Default neutral score for new suppliers
  
  if (!orderError && orderStats && orderStats.length > 0) {
    const totalOrders = orderStats.length;
    const fulfilledOrders = orderStats.filter(o => 
      o.order_status === 'delivered' || o.order_status === 'completed'
    ).length;
    const cancelledOrders = orderStats.filter(o => 
      o.order_status === 'cancelled' || o.order_status === 'failed'
    ).length;
    
    // Fulfillment rate = (fulfilled / (total - cancelled)) * 100
    const relevantOrders = totalOrders - cancelledOrders;
    if (relevantOrders > 0) {
      fulfillmentScore = (fulfilledOrders / relevantOrders) * 100;
    }
    
    console.log(`[Supplier Score] Fulfillment: ${fulfilledOrders}/${relevantOrders} orders = ${fulfillmentScore.toFixed(2)}`);
  } else {
    console.log(`[Supplier Score] No orders found, using default fulfillment score`);
  }
  
  // Component 2: Delivery Timeliness (25%)
  // Percentage of deliveries completed on time or early
  const { data: deliveries, error: deliveryError } = await supabase
    .from('deliveries')
    .select('estimated_delivery_date, actual_delivery_date, delivery_status')
    .eq('supplier_id', supplierId)
    .eq('delivery_status', 'delivered');
  
  let deliveryScore = 50; // Default neutral score
  
  if (!deliveryError && deliveries && deliveries.length > 0) {
    const totalDeliveries = deliveries.length;
    let onTimeCount = 0;
    
    for (const delivery of deliveries) {
      if (delivery.actual_delivery_date && delivery.estimated_delivery_date) {
        const actualDate = new Date(delivery.actual_delivery_date);
        const estimatedDate = new Date(delivery.estimated_delivery_date);
        
        if (actualDate <= estimatedDate) {
          onTimeCount++;
        }
      }
    }
    
    deliveryScore = (onTimeCount / totalDeliveries) * 100;
    
    console.log(`[Supplier Score] Delivery: ${onTimeCount}/${totalDeliveries} on-time = ${deliveryScore.toFixed(2)}`);
  } else {
    console.log(`[Supplier Score] No deliveries found, using default delivery score`);
  }
  
  // Component 3: Product Availability (20%)
  // Percentage of products in stock vs total products offered
  const { data: products, error: productsError } = await supabase
    .from('supplier_products')
    .select('id, availability_status')
    .eq('supplier_id', supplierId)
    .eq('is_active', true);
  
  let availabilityScore = 50; // Default neutral score
  
  if (!productsError && products && products.length > 0) {
    const totalProducts = products.length;
    const availableProducts = products.filter(p => 
      p.availability_status === 'available' || p.availability_status === 'in_stock'
    ).length;
    
    availabilityScore = (availableProducts / totalProducts) * 100;
    
    console.log(`[Supplier Score] Availability: ${availableProducts}/${totalProducts} in stock = ${availabilityScore.toFixed(2)}`);
  } else {
    console.log(`[Supplier Score] No products found, using default availability score`);
  }
  
  // Component 4: Product Quality (15%)
  // Based on vendor feedback and ratings (if available)
  // For now, check order issues/complaints
  const { data: orderIssues, error: issuesError } = await supabase
    .from('stock_orders')
    .select('order_status, notes')
    .eq('supplier_id', supplierId);
  
  let qualityScore = 75; // Default good quality score for suppliers without issues
  
  if (!issuesError && orderIssues && orderIssues.length > 0) {
    const totalOrders = orderIssues.length;
    
    // Count orders with quality issues (check for keywords in notes or failed status)
    const issueCount = orderIssues.filter(o => {
      const hasIssueStatus = o.order_status === 'disputed' || o.order_status === 'failed';
      const hasIssueInNotes = o.notes && (
        o.notes.toLowerCase().includes('quality') ||
        o.notes.toLowerCase().includes('defect') ||
        o.notes.toLowerCase().includes('damaged') ||
        o.notes.toLowerCase().includes('wrong') ||
        o.notes.toLowerCase().includes('complaint')
      );
      return hasIssueStatus || hasIssueInNotes;
    }).length;
    
    // Quality score: fewer issues = higher score
    // 0 issues = 100, 10% issues = 90, 20% issues = 80, etc.
    const issueRate = issueCount / totalOrders;
    qualityScore = Math.max(0, 100 - (issueRate * 100));
    
    console.log(`[Supplier Score] Quality: ${issueCount}/${totalOrders} issues = ${qualityScore.toFixed(2)}`);
  } else {
    console.log(`[Supplier Score] No orders to assess quality, using default score`);
  }
  
  // Component 5: Price Competitiveness (15%)
  // Compare supplier's average prices to market average
  const { data: supplierPrices, error: pricesError } = await supabase
    .from('supplier_products')
    .select('unit_price, product_id')
    .eq('supplier_id', supplierId)
    .eq('is_active', true);
  
  let priceScore = 50; // Default neutral score
  
  if (!pricesError && supplierPrices && supplierPrices.length > 0) {
    const productIds = supplierPrices.map(p => p.product_id);
    
    // Get market average prices for the same products
    const { data: marketPrices, error: marketError } = await supabase
      .from('supplier_products')
      .select('unit_price, product_id')
      .in('product_id', productIds)
      .eq('is_active', true);
    
    if (!marketError && marketPrices && marketPrices.length > 0) {
      // Calculate average supplier price
      const avgSupplierPrice = supplierPrices.reduce((sum, p) => sum + Number(p.unit_price), 0) / supplierPrices.length;
      
      // Calculate average market price
      const avgMarketPrice = marketPrices.reduce((sum, p) => sum + Number(p.unit_price), 0) / marketPrices.length;
      
      if (avgMarketPrice > 0) {
        // Calculate price difference percentage
        const priceDiff = (avgSupplierPrice - avgMarketPrice) / avgMarketPrice;
        
        // Scoring: 10% below market = 100, at market = 75, 10% above = 50, 20%+ above = 25
        if (priceDiff <= -0.10) {
          priceScore = 100; // 10% or more below market
        } else if (priceDiff < 0) {
          priceScore = 75 + (Math.abs(priceDiff) * 250); // Between 0% and 10% below
        } else if (priceDiff === 0) {
          priceScore = 75; // Exactly at market
        } else if (priceDiff <= 0.10) {
          priceScore = 75 - (priceDiff * 250); // Between 0% and 10% above
        } else if (priceDiff <= 0.20) {
          priceScore = 25; // Between 10% and 20% above
        } else {
          priceScore = 10; // More than 20% above market
        }
        
        console.log(`[Supplier Score] Price: Avg ${avgSupplierPrice.toFixed(2)} vs Market ${avgMarketPrice.toFixed(2)} (${(priceDiff * 100).toFixed(1)}%) = ${priceScore.toFixed(2)}`);
      }
    }
  } else {
    console.log(`[Supplier Score] No pricing data found, using default price score`);
  }
  
  // Round all component scores to 2 decimal places
  const components: SupplierScoreComponents = {
    fulfillment: Math.round(fulfillmentScore * 100) / 100,
    delivery: Math.round(deliveryScore * 100) / 100,
    availability: Math.round(availabilityScore * 100) / 100,
    quality: Math.round(qualityScore * 100) / 100,
    price: Math.round(priceScore * 100) / 100
  };
  
  // Calculate weighted total score
  // Weights: fulfillment 25%, delivery 25%, availability 20%, quality 15%, price 15%
  const totalScore = 
    components.fulfillment * 0.25 +
    components.delivery * 0.25 +
    components.availability * 0.20 +
    components.quality * 0.15 +
    components.price * 0.15;
  
  const finalScore = Math.round(totalScore * 100) / 100;
  
  console.log(`[Supplier Score] Total score: ${finalScore}`);
  console.log(`[Supplier Score] Components:`, components);
  
  return {
    score: finalScore,
    components
  };
}

/**
 * Main request handler
 */
serve(async (req: Request) => {
  const origin = req.headers.get('origin') || 'https://www.stokika.com';
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  try {
    // Initialize Supabase client with service role for privileged access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { supplierId } = await req.json();
    
    // Validate input
    if (!supplierId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: supplierId' 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      );
    }
    
    // Verify supplier exists
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, business_name')
      .eq('id', supplierId)
      .single();
    
    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ 
          error: 'Supplier not found' 
        }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      );
    }
    
    console.log(`[Supplier Score] Processing score for supplier: ${supplier.business_name}`);
    
    // Calculate supplier score
    const result = await calculateSupplierScore(supabase, supplierId);
    
    // Store the score in supplier_scores table
    const { data: scoreRecord, error: insertError } = await supabase
      .from('supplier_scores')
      .insert({
        supplier_id: supplierId,
        fulfillment_score: result.components.fulfillment,
        delivery_score: result.components.delivery,
        availability_score: result.components.availability,
        quality_score: result.components.quality,
        price_score: result.components.price,
        score_value: result.score,
        components: result.components,
        calculation_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[Supplier Score] Error storing score:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store supplier score',
          details: insertError.message
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin
          }
        }
      );
    }
    
    // Log to audit_logs
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let userId = 'system'; // Default for scheduled runs
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }
    
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action_type: 'supplier_score_calculated',
        resource_type: 'supplier',
        resource_id: supplierId,
        status: 'success',
        details: {
          score: result.score,
          components: result.components
        },
        ip_address: req.headers.get('X-Forwarded-For') || 'unknown',
        user_agent: req.headers.get('User-Agent') || 'unknown'
      });
    
    console.log(`[Supplier Score] Score calculation complete for ${supplier.business_name}`);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        supplierId,
        supplierName: supplier.business_name,
        score: result.score,
        components: result.components,
        calculationDate: scoreRecord.calculation_date
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    );
    
  } catch (error) {
    console.error('[Supplier Score] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin
        }
      }
    );
  }
});
