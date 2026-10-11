import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScoringResult {
  entity_id: string
  entity_type: 'vendor' | 'supplier'
  success: boolean
  error?: string
}

interface ScoringResponse {
  success: boolean
  timestamp: string
  vendors_processed: number
  vendors_succeeded: number
  vendors_failed: number
  suppliers_processed: number
  suppliers_succeeded: number
  suppliers_failed: number
  duration_ms: number
  errors: string[]
}

/**
 * Scheduled Scoring Update Edge Function
 * 
 * This function is designed to be invoked by a cron job (pg_cron or external scheduler)
 * to recalculate vendor and supplier scores on a daily basis.
 * 
 * Requirements: 10.11, 16.3, 16.6
 * 
 * Sub-tasks:
 * - Trigger calculate-vendor-score for all active vendors
 * - Trigger calculate-supplier-score for all active suppliers
 * - Run daily via cron schedule
 * - Add comprehensive logging
 */
serve(async (req) => {
  const startTime = Date.now()
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Scheduled scoring update started:', {
      timestamp: new Date().toISOString(),
      method: req.method
    })

    // Initialize Supabase client with service role key for privileged operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize result tracking
    const results: ScoringResult[] = []
    const errors: string[] = []

    // ========================================================================
    // PART 1: Process All Active Vendors
    // ========================================================================
    
    console.log('Fetching active vendors...')
    
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, business_name, is_verified')
      .eq('onboarding_completed', true)
      .order('created_at', { ascending: true })

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError)
      errors.push(`Failed to fetch vendors: ${vendorsError.message}`)
    } else {
      console.log(`Found ${vendors?.length || 0} active vendors to process`)
      
      // Process each vendor
      for (const vendor of vendors || []) {
        try {
          console.log(`Processing vendor: ${vendor.business_name} (${vendor.id})`)
          
          // Call calculate-vendor-score Edge Function
          const calculateVendorScoreUrl = `${supabaseUrl}/functions/v1/calculate-vendor-score`
          const response = await fetch(calculateVendorScoreUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ vendor_id: vendor.id })
          })

          if (response.ok) {
            const result = await response.json()
            console.log(`✓ Vendor score calculated: ${vendor.business_name}`, {
              vendor_id: vendor.id,
              score: result.score_value
            })
            
            results.push({
              entity_id: vendor.id,
              entity_type: 'vendor',
              success: true
            })
          } else {
            const errorText = await response.text()
            console.error(`✗ Failed to calculate vendor score: ${vendor.business_name}`, {
              vendor_id: vendor.id,
              status: response.status,
              error: errorText
            })
            
            results.push({
              entity_id: vendor.id,
              entity_type: 'vendor',
              success: false,
              error: `HTTP ${response.status}: ${errorText}`
            })
            
            errors.push(`Vendor ${vendor.business_name}: ${errorText}`)
          }
        } catch (vendorError: any) {
          console.error(`✗ Exception processing vendor: ${vendor.business_name}`, vendorError)
          
          results.push({
            entity_id: vendor.id,
            entity_type: 'vendor',
            success: false,
            error: vendorError.message || 'Unknown error'
          })
          
          errors.push(`Vendor ${vendor.business_name}: ${vendorError.message}`)
        }
      }
    }

    // ========================================================================
    // PART 2: Process All Active Suppliers
    // ========================================================================
    
    console.log('Fetching active suppliers...')
    
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, business_name, is_verified, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (suppliersError) {
      console.error('Error fetching suppliers:', suppliersError)
      errors.push(`Failed to fetch suppliers: ${suppliersError.message}`)
    } else {
      console.log(`Found ${suppliers?.length || 0} active suppliers to process`)
      
      // Process each supplier
      for (const supplier of suppliers || []) {
        try {
          console.log(`Processing supplier: ${supplier.business_name} (${supplier.id})`)
          
          // Call calculate-supplier-score Edge Function
          const calculateSupplierScoreUrl = `${supabaseUrl}/functions/v1/calculate-supplier-score`
          const response = await fetch(calculateSupplierScoreUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ supplier_id: supplier.id })
          })

          if (response.ok) {
            const result = await response.json()
            console.log(`✓ Supplier score calculated: ${supplier.business_name}`, {
              supplier_id: supplier.id,
              score: result.score_value
            })
            
            results.push({
              entity_id: supplier.id,
              entity_type: 'supplier',
              success: true
            })
          } else {
            const errorText = await response.text()
            console.error(`✗ Failed to calculate supplier score: ${supplier.business_name}`, {
              supplier_id: supplier.id,
              status: response.status,
              error: errorText
            })
            
            results.push({
              entity_id: supplier.id,
              entity_type: 'supplier',
              success: false,
              error: `HTTP ${response.status}: ${errorText}`
            })
            
            errors.push(`Supplier ${supplier.business_name}: ${errorText}`)
          }
        } catch (supplierError: any) {
          console.error(`✗ Exception processing supplier: ${supplier.business_name}`, supplierError)
          
          results.push({
            entity_id: supplier.id,
            entity_type: 'supplier',
            success: false,
            error: supplierError.message || 'Unknown error'
          })
          
          errors.push(`Supplier ${supplier.business_name}: ${supplierError.message}`)
        }
      }
    }

    // ========================================================================
    // PART 3: Generate Summary Report
    // ========================================================================
    
    const vendorResults = results.filter(r => r.entity_type === 'vendor')
    const supplierResults = results.filter(r => r.entity_type === 'supplier')
    
    const summary: ScoringResponse = {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      vendors_processed: vendorResults.length,
      vendors_succeeded: vendorResults.filter(r => r.success).length,
      vendors_failed: vendorResults.filter(r => !r.success).length,
      suppliers_processed: supplierResults.length,
      suppliers_succeeded: supplierResults.filter(r => r.success).length,
      suppliers_failed: supplierResults.filter(r => !r.success).length,
      duration_ms: Date.now() - startTime,
      errors: errors
    }

    console.log('Scheduled scoring update completed:', summary)

    // Return summary response
    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Scheduled scoring update error:', error)
    
    const errorResponse: ScoringResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      vendors_processed: 0,
      vendors_succeeded: 0,
      vendors_failed: 0,
      suppliers_processed: 0,
      suppliers_succeeded: 0,
      suppliers_failed: 0,
      duration_ms: Date.now() - startTime,
      errors: [error.message || 'Unknown error']
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
