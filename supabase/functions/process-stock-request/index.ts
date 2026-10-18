/**
 * Process Stock Request Edge Function
 * 
 * This Supabase Edge Function processes stock requests from vendors. It handles
 * authentication, eligibility verification, supplier matching, inventory reservation,
 * and delivery record creation.
 * 
 * Requirements:
 * - 10.7: Validate stock request against eligibility before creating order
 * - 15.2-15.15: Stock request and eligibility workflow
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Stock request item interface
 */
interface StockRequestItem {
  productId: string;        // UUID of product
  quantity: number;         // Requested quantity
  notes?: string;           // Optional notes
}

/**
 * Stock request payload interface
 * 
 * Requirements: 15.1 - Stock request fields
 */
interface StockRequestPayload {
  items: StockRequestItem[];
  requestedDeliveryDate?: string;  // ISO date string
  notes?: string;
}

/**
 * Stock request response interface
 */
interface StockRequestResponse {
  success: boolean;
  stockRequestId?: string;
  requestNumber?: string;
  totalAmount?: number;
  deliveryId?: string;
  error?: string;
  details?: string;
}

/**
 * Vendor eligibility data from database
 */
interface VendorEligibility {
  id: string;
  vendor_id: string;
  eligibility_amount: number;
  is_eligible: boolean;
  outstanding_balance: number;
  eligibility_tier: string;
}

/**
 * Supplier match data from database
 */
interface SupplierMatch {
  supplier_id: string;
  match_score: number;
  product_match_score: number;
  availability_score: number;
  price_score: number;
}

/**
 * Supplier product data with pricing
 */
interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string;
  unit_price: number;
  minimum_order_quantity: number;
  maximum_order_quantity: number | null;
  availability_status: string;
}

/**
 * Inventory data
 */
interface Inventory {
  id: string;
  supplier_product_id: string;
  current_quantity: number;
  reserved_quantity: number;
}

/**
 * Generate unique request number
 * Format: SR-YYYYMMDD-XXXXXX
 * 
 * Requirements: 15.5 - Create stock_request with unique number
 */
function generateRequestNumber(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  
  // Generate 6-digit random number
  const random = Math.floor(100000 + Math.random() * 900000);
  
  return `SR-${dateStr}-${random}`;
}

/**
 * Generate unique delivery number
 * Format: DEL-YYYYMMDD-XXXXXX
 * 
 * Requirements: 15.12 - Create delivery record
 */
function generateDeliveryNumber(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  
  // Generate 6-digit random number
  const random = Math.floor(100000 + Math.random() * 900000);
  
  return `DEL-${dateStr}-${random}`;
}

/**
 * Authenticate user and get vendor ID
 * 
 * Requirements: Task 17.1 - Authenticate user via JWT
 */
async function authenticateAndGetVendor(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null
): Promise<{ userId: string; vendorId: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  // Get user from JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    throw new Error('Invalid authentication token');
  }

  // Get vendor record for this user
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (vendorError || !vendor) {
    throw new Error('Vendor profile not found for this user');
  }

  console.log(`[Process Stock Request] Authenticated vendor: ${vendor.id}`);

  return {
    userId: user.id,
    vendorId: vendor.id
  };
}

/**
 * Retrieve vendor eligibility from database
 * 
 * Requirements:
 * - 15.2: Retrieve vendor's stock eligibility
 * - Task 17.1: Retrieve vendor eligibility from database
 */
async function getVendorEligibility(
  supabase: ReturnType<typeof createClient>,
  vendorId: string
): Promise<VendorEligibility> {
  const { data: eligibility, error } = await supabase
    .from('vendor_eligibility')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_eligible', true)
    .order('last_calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      throw new Error('No eligibility record found. Please contact support.');
    }
    throw new Error(`Failed to retrieve eligibility: ${error.message}`);
  }

  if (!eligibility.is_eligible) {
    throw new Error(`You are currently not eligible for stock requests. Reason: ${eligibility.ineligibility_reason || 'Not specified'}`);
  }

  console.log(`[Process Stock Request] Vendor eligibility: ${eligibility.eligibility_amount} KES, Outstanding: ${eligibility.outstanding_balance || 0} KES`);

  return eligibility;
}

/**
 * Calculate total request value based on items and supplier pricing
 * 
 * Requirements:
 * - 15.3: Calculate total request value
 * - Task 17.1: Calculate total request value
 */
async function calculateRequestValue(
  supabase: ReturnType<typeof createClient>,
  items: StockRequestItem[],
  supplierId?: string
): Promise<{ totalValue: number; itemDetails: Array<{ item: StockRequestItem; unitPrice: number; subtotal: number; supplierProductId: string }> }> {
  const itemDetails: Array<{ item: StockRequestItem; unitPrice: number; subtotal: number; supplierProductId: string }> = [];
  let totalValue = 0;

  for (const item of items) {
    // Get product pricing from supplier_products
    let query = supabase
      .from('supplier_products')
      .select('id, unit_price, minimum_order_quantity, maximum_order_quantity, availability_status, supplier_id')
      .eq('product_id', item.productId)
      .eq('availability_status', 'available');

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data: supplierProducts, error } = await query;

    if (error) {
      throw new Error(`Failed to get pricing for product ${item.productId}: ${error.message}`);
    }

    if (!supplierProducts || supplierProducts.length === 0) {
      throw new Error(`Product ${item.productId} is not available from any supplier`);
    }

    // Use the first available supplier product (or the only one if supplierId was specified)
    const supplierProduct = supplierProducts[0];

    // Validate quantity constraints
    if (item.quantity < supplierProduct.minimum_order_quantity) {
      throw new Error(`Quantity ${item.quantity} is below minimum order quantity ${supplierProduct.minimum_order_quantity} for product ${item.productId}`);
    }

    if (supplierProduct.maximum_order_quantity && item.quantity > supplierProduct.maximum_order_quantity) {
      throw new Error(`Quantity ${item.quantity} exceeds maximum order quantity ${supplierProduct.maximum_order_quantity} for product ${item.productId}`);
    }

    const subtotal = item.quantity * supplierProduct.unit_price;
    totalValue += subtotal;

    itemDetails.push({
      item,
      unitPrice: supplierProduct.unit_price,
      subtotal,
      supplierProductId: supplierProduct.id
    });
  }

  console.log(`[Process Stock Request] Total request value: ${totalValue} KES`);

  return { totalValue, itemDetails };
}

/**
 * Validate request against eligibility
 * 
 * Requirements:
 * - 15.4: Reject if total exceeds eligibility
 * - Task 17.1: Validate request against eligibility
 */
function validateAgainstEligibility(
  totalValue: number,
  eligibility: VendorEligibility
): void {
  const availableCredit = eligibility.eligibility_amount - (eligibility.outstanding_balance || 0);

  console.log(`[Process Stock Request] Available credit: ${availableCredit} KES, Requested: ${totalValue} KES`);

  if (totalValue > availableCredit) {
    throw new Error(
      `Request value (${totalValue} KES) exceeds your available credit (${availableCredit} KES). ` +
      `Eligibility: ${eligibility.eligibility_amount} KES, Outstanding: ${eligibility.outstanding_balance || 0} KES`
    );
  }
}

/**
 * Match supplier using supplier_matches or simple matching logic
 * 
 * Requirements:
 * - 15.6-15.7: Match supplier using supplier_matches
 * - Task 17.1: Match supplier using supplier_matches
 */
async function matchSupplier(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  items: StockRequestItem[]
): Promise<string> {
  // Try to find best supplier match from supplier_matches table
  const { data: matches, error: matchError } = await supabase
    .from('supplier_matches')
    .select('supplier_id, match_score, product_match_score, availability_score')
    .eq('vendor_id', vendorId)
    .order('match_score', { ascending: false })
    .limit(5);

  if (matchError) {
    console.warn(`[Process Stock Request] Failed to retrieve supplier matches: ${matchError.message}`);
  }

  if (matches && matches.length > 0) {
    // Verify that the top match has the requested products available
    for (const match of matches) {
      const { data: availableProducts } = await supabase
        .from('supplier_products')
        .select('product_id')
        .eq('supplier_id', match.supplier_id)
        .eq('availability_status', 'available')
        .in('product_id', items.map(i => i.productId));

      if (availableProducts && availableProducts.length === items.length) {
        console.log(`[Process Stock Request] Matched supplier: ${match.supplier_id} (score: ${match.match_score})`);
        return match.supplier_id;
      }
    }
  }

  // Fallback: Simple matching - find any supplier with all products available
  console.log(`[Process Stock Request] No pre-calculated match found, using simple matching`);

  const { data: suppliers, error: supplierError } = await supabase
    .from('supplier_products')
    .select('supplier_id')
    .in('product_id', items.map(i => i.productId))
    .eq('availability_status', 'available');

  if (supplierError || !suppliers || suppliers.length === 0) {
    throw new Error('No suitable supplier found for the requested products');
  }

  // Count which supplier has the most matching products
  const supplierCounts = suppliers.reduce((acc: Record<string, number>, curr) => {
    acc[curr.supplier_id] = (acc[curr.supplier_id] || 0) + 1;
    return acc;
  }, {});

  // Find supplier with all products
  const supplierWithAllProducts = Object.entries(supplierCounts).find(
    ([_, count]) => count === items.length
  );

  if (!supplierWithAllProducts) {
    throw new Error('No supplier found with all requested products available');
  }

  console.log(`[Process Stock Request] Simple match found supplier: ${supplierWithAllProducts[0]}`);
  return supplierWithAllProducts[0];
}

/**
 * Reserve inventory for the stock request
 * 
 * Requirements:
 * - 15.11: Reserve inventory from supplier
 * - Task 17.1: Reserve inventory if available
 */
async function reserveInventory(
  supabase: ReturnType<typeof createClient>,
  itemDetails: Array<{ item: StockRequestItem; unitPrice: number; subtotal: number; supplierProductId: string }>
): Promise<void> {
  for (const detail of itemDetails) {
    // Get current inventory
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('id, current_quantity, reserved_quantity')
      .eq('supplier_product_id', detail.supplierProductId)
      .single();

    if (invError) {
      throw new Error(`Failed to check inventory for product: ${invError.message}`);
    }

    if (!inventory) {
      throw new Error(`No inventory record found for product`);
    }

    const availableQuantity = inventory.current_quantity - inventory.reserved_quantity;

    if (availableQuantity < detail.item.quantity) {
      throw new Error(`Insufficient inventory. Available: ${availableQuantity}, Requested: ${detail.item.quantity}`);
    }

    // Update reserved quantity
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        reserved_quantity: inventory.reserved_quantity + detail.item.quantity
      })
      .eq('id', inventory.id);

    if (updateError) {
      throw new Error(`Failed to reserve inventory: ${updateError.message}`);
    }

    // Log inventory movement
    await supabase
      .from('inventory_movements')
      .insert({
        inventory_id: inventory.id,
        movement_type: 'reservation',
        quantity: detail.item.quantity,
        notes: `Reserved for stock request`
      });

    console.log(`[Process Stock Request] Reserved ${detail.item.quantity} units for product ${detail.item.productId}`);
  }
}

/**
 * Create stock request, items, and delivery records
 * 
 * Requirements:
 * - 15.5: Create stock_request record
 * - 15.8-15.10: Create stock order and items
 * - 15.12: Create delivery record
 * - Task 17.1: Create stock_request, stock_request_items, delivery records
 */
async function createStockRecords(
  supabase: ReturnType<typeof createClient>,
  vendorId: string,
  supplierId: string,
  payload: StockRequestPayload,
  totalValue: number,
  itemDetails: Array<{ item: StockRequestItem; unitPrice: number; subtotal: number; supplierProductId: string }>
): Promise<{ stockRequestId: string; requestNumber: string; deliveryId: string }> {
  const requestNumber = generateRequestNumber();
  const deliveryNumber = generateDeliveryNumber();

  // Create stock request
  const { data: stockRequest, error: requestError } = await supabase
    .from('stock_requests')
    .insert({
      request_number: requestNumber,
      vendor_id: vendorId,
      supplier_id: supplierId,
      request_status: 'submitted',
      total_amount: totalValue,
      requested_delivery_date: payload.requestedDeliveryDate || null,
      notes: payload.notes || null,
      submitted_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (requestError) {
    throw new Error(`Failed to create stock request: ${requestError.message}`);
  }

  console.log(`[Process Stock Request] Created stock request: ${stockRequest.id}`);

  // Create stock request items
  const itemInserts = itemDetails.map(detail => ({
    stock_request_id: stockRequest.id,
    product_id: detail.item.productId,
    quantity: detail.item.quantity,
    unit_price: detail.unitPrice,
    subtotal: detail.subtotal,
    notes: detail.item.notes || null
  }));

  const { error: itemsError } = await supabase
    .from('stock_request_items')
    .insert(itemInserts);

  if (itemsError) {
    throw new Error(`Failed to create stock request items: ${itemsError.message}`);
  }

  console.log(`[Process Stock Request] Created ${itemInserts.length} stock request items`);

  // Get vendor details for delivery address
  const { data: vendor } = await supabase
    .from('vendors')
    .select('physical_location, contact_person, phone_number')
    .eq('id', vendorId)
    .single();

  // Create delivery record
  const estimatedDeliveryDate = payload.requestedDeliveryDate || 
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default: 7 days from now

  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .insert({
      delivery_number: deliveryNumber,
      stock_request_id: stockRequest.id,
      delivery_status: 'pending',
      delivery_address: vendor?.physical_location || 'Address not provided',
      delivery_contact_name: vendor?.contact_person || null,
      delivery_contact_phone: vendor?.phone_number || null,
      scheduled_delivery_date: estimatedDeliveryDate
    })
    .select('id')
    .single();

  if (deliveryError) {
    console.warn(`[Process Stock Request] Failed to create delivery record: ${deliveryError.message}`);
    // Don't fail the entire request if delivery creation fails
  } else {
    console.log(`[Process Stock Request] Created delivery record: ${delivery.id}`);
  }

  return {
    stockRequestId: stockRequest.id,
    requestNumber,
    deliveryId: delivery?.id || ''
  };
}

/**
 * Log to audit logs
 * 
 * Requirements: Task 17.1 - Log all steps to audit_logs
 */
async function logAudit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      resource_type: 'stock_request',
      details,
      ip_address: null, // Not available in Edge Function context
      user_agent: null
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
    console.log('[Process Stock Request] Function invoked');

    // Initialize Supabase client with service role for privileged operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');

    // Parse request body
    let payload: StockRequestPayload;
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
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request must include at least one item'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate each item
    for (const item of payload.items) {
      if (!item.productId || typeof item.productId !== 'string') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Each item must have a valid productId'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Each item must have a positive quantity'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Step 1: Authenticate user
    const { userId, vendorId } = await authenticateAndGetVendor(supabase, authHeader);

    // Step 2: Retrieve vendor eligibility
    const eligibility = await getVendorEligibility(supabase, vendorId);

    // Step 3: Match supplier
    const supplierId = await matchSupplier(supabase, vendorId, payload.items);

    // Step 4: Calculate total request value with matched supplier
    const { totalValue, itemDetails } = await calculateRequestValue(
      supabase,
      payload.items,
      supplierId
    );

    // Step 5: Validate against eligibility
    validateAgainstEligibility(totalValue, eligibility);

    // Step 6: Reserve inventory
    await reserveInventory(supabase, itemDetails);

    // Step 7: Create stock request, items, and delivery records
    const { stockRequestId, requestNumber, deliveryId } = await createStockRecords(
      supabase,
      vendorId,
      supplierId,
      payload,
      totalValue,
      itemDetails
    );

    // Step 8: Log to audit logs
    await logAudit(supabase, userId, 'stock_request_created', {
      stock_request_id: stockRequestId,
      request_number: requestNumber,
      vendor_id: vendorId,
      supplier_id: supplierId,
      total_amount: totalValue,
      items_count: payload.items.length
    });

    // Return success response
    const response: StockRequestResponse = {
      success: true,
      stockRequestId,
      requestNumber,
      totalAmount: totalValue,
      deliveryId
    };

    console.log('[Process Stock Request] Successfully processed stock request');

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Process Stock Request] Error:', error);

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
