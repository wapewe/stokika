import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CycleCheckResult {
  cycle_id: string
  vendor_id: string
  vendor_name: string
  success: boolean
  error?: string
}

interface CycleCheckResponse {
  success: boolean
  timestamp: string
  cycles_checked: number
  cycles_marked_overdue: number
  cycles_failed: number
  vendors_scored: number
  vendors_score_failed: number
  duration_ms: number
  errors: string[]
}

/**
 * Scheduled Cycle Check Edge Function
 * 
 * This function is designed to be invoked by a cron job (pg_cron or external scheduler)
 * to check for overdue stock repayment cycles on a daily basis.
 * 
 * Requirements: 10.11, 19.9, 19.10, 19.11
 * 
 * Business Logic:
 * - Query all active stock_cycles with end_date < today and balance > 0
 * - Update cycle_status to "overdue"
 * - Reduce vendor_score for each overdue cycle by triggering recalculation
 * - Log all actions to audit_logs table
 * - Run daily via cron schedule
 */
serve(async (req) => {
  const startTime = Date.now()
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Scheduled cycle check started:', {
      timestamp: new Date().toISOString(),
      method: req.method
    })

    // Initialize Supabase client with service role key for privileged operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize result tracking
    const results: CycleCheckResult[] = []
    const errors: string[] = []
    const vendorsToUpdate = new Set<string>() // Track unique vendors needing score updates

    // ========================================================================
    // PART 1: Query Overdue Cycles
    // ========================================================================
    
    console.log('Querying for overdue cycles...')
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    const { data: overdueCycles, error: queryError } = await supabase
      .from('stock_cycles')
      .select(`
        id,
        vendor_id,
        cycle_type,
        start_date,
        end_date,
        total_amount,
        paid_amount,
        balance,
        cycle_status,
        vendors (
          id,
          business_name
        )
      `)
      .eq('cycle_status', 'active')
      .lt('end_date', today)
      .gt('balance', 0)
      .order('end_date', { ascending: true })

    if (queryError) {
      console.error('Error querying overdue cycles:', queryError)
      errors.push(`Failed to query cycles: ${queryError.message}`)
      
      const errorResponse: CycleCheckResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        cycles_checked: 0,
        cycles_marked_overdue: 0,
        cycles_failed: 0,
        vendors_scored: 0,
        vendors_score_failed: 0,
        duration_ms: Date.now() - startTime,
        errors: errors
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    console.log(`Found ${overdueCycles?.length || 0} overdue cycles to process`)

    if (!overdueCycles || overdueCycles.length === 0) {
      // No overdue cycles found - this is a success case
      const successResponse: CycleCheckResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        cycles_checked: 0,
        cycles_marked_overdue: 0,
        cycles_failed: 0,
        vendors_scored: 0,
        vendors_score_failed: 0,
        duration_ms: Date.now() - startTime,
        errors: []
      }
      
      console.log('No overdue cycles found - job completed successfully')
      
      return new Response(
        JSON.stringify(successResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // ========================================================================
    // PART 2: Mark Cycles as Overdue
    // ========================================================================
    
    console.log('Marking cycles as overdue...')
    
    for (const cycle of overdueCycles) {
      try {
        const vendorName = cycle.vendors?.business_name || 'Unknown Vendor'
        
        console.log(`Processing cycle: ${cycle.id} for vendor ${vendorName}`, {
          cycle_id: cycle.id,
          vendor_id: cycle.vendor_id,
          end_date: cycle.end_date,
          balance: cycle.balance
        })
        
        // Update cycle status to overdue
        const { error: updateError } = await supabase
          .from('stock_cycles')
          .update({ 
            cycle_status: 'overdue',
            updated_at: new Date().toISOString()
          })
          .eq('id', cycle.id)
        
        if (updateError) {
          console.error(`✗ Failed to update cycle ${cycle.id}:`, updateError)
          
          results.push({
            cycle_id: cycle.id,
            vendor_id: cycle.vendor_id,
            vendor_name: vendorName,
            success: false,
            error: `Failed to update status: ${updateError.message}`
          })
          
          errors.push(`Cycle ${cycle.id} (${vendorName}): ${updateError.message}`)
          continue
        }
        
        console.log(`✓ Marked cycle ${cycle.id} as overdue`)
        
        // Log to audit_logs
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            user_id: null, // System action
            action_type: 'delivery_status_changed', // Using closest match for cycle status change
            resource_type: 'stock_cycle',
            resource_id: cycle.id,
            action_status: 'success',
            details: {
              previous_status: 'active',
              new_status: 'overdue',
              cycle_type: cycle.cycle_type,
              end_date: cycle.end_date,
              balance: cycle.balance,
              vendor_id: cycle.vendor_id,
              vendor_name: vendorName,
              reason: 'Automated cycle check - end date passed with outstanding balance'
            }
          })
        
        if (auditError) {
          console.warn(`⚠ Failed to log audit entry for cycle ${cycle.id}:`, auditError)
          // Don't fail the operation if audit logging fails
        }
        
        results.push({
          cycle_id: cycle.id,
          vendor_id: cycle.vendor_id,
          vendor_name: vendorName,
          success: true
        })
        
        // Track vendor for score update
        vendorsToUpdate.add(cycle.vendor_id)
        
      } catch (cycleError: any) {
        console.error(`✗ Exception processing cycle ${cycle.id}:`, cycleError)
        
        results.push({
          cycle_id: cycle.id,
          vendor_id: cycle.vendor_id,
          vendor_name: cycle.vendors?.business_name || 'Unknown',
          success: false,
          error: cycleError.message || 'Unknown error'
        })
        
        errors.push(`Cycle ${cycle.id}: ${cycleError.message}`)
      }
    }

    // ========================================================================
    // PART 3: Update Vendor Scores
    // ========================================================================
    
    console.log(`Updating scores for ${vendorsToUpdate.size} affected vendors...`)
    
    let vendorsScored = 0
    let vendorsScoreFailed = 0
    
    for (const vendorId of vendorsToUpdate) {
      try {
        // Get vendor name for logging
        const { data: vendor } = await supabase
          .from('vendors')
          .select('business_name')
          .eq('id', vendorId)
          .single()
        
        const vendorName = vendor?.business_name || vendorId
        
        console.log(`Recalculating score for vendor: ${vendorName} (${vendorId})`)
        
        // Call calculate-vendor-score Edge Function
        const calculateVendorScoreUrl = `${supabaseUrl}/functions/v1/calculate-vendor-score`
        const response = await fetch(calculateVendorScoreUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ vendor_id: vendorId })
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`✓ Vendor score recalculated: ${vendorName}`, {
            vendor_id: vendorId,
            score: result.score_value
          })
          
          vendorsScored++
          
          // Log score change to audit_logs
          await supabase
            .from('audit_logs')
            .insert({
              user_id: null,
              action_type: 'vendor_score_changed',
              resource_type: 'vendor',
              resource_id: vendorId,
              action_status: 'success',
              details: {
                trigger: 'overdue_cycle_check',
                new_score: result.score_value,
                reason: 'Score reduced due to overdue payment cycles'
              }
            })
          
        } else {
          const errorText = await response.text()
          console.error(`✗ Failed to calculate vendor score: ${vendorName}`, {
            vendor_id: vendorId,
            status: response.status,
            error: errorText
          })
          
          vendorsScoreFailed++
          errors.push(`Vendor ${vendorName} score update: ${errorText}`)
        }
      } catch (vendorError: any) {
        console.error(`✗ Exception updating vendor score: ${vendorId}`, vendorError)
        vendorsScoreFailed++
        errors.push(`Vendor ${vendorId} score update: ${vendorError.message}`)
      }
    }

    // ========================================================================
    // PART 4: Generate Summary Report
    // ========================================================================
    
    const summary: CycleCheckResponse = {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      cycles_checked: overdueCycles.length,
      cycles_marked_overdue: results.filter(r => r.success).length,
      cycles_failed: results.filter(r => !r.success).length,
      vendors_scored: vendorsScored,
      vendors_score_failed: vendorsScoreFailed,
      duration_ms: Date.now() - startTime,
      errors: errors
    }

    console.log('Scheduled cycle check completed:', summary)

    // Log summary to audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        user_id: null,
        action_type: 'configuration_changed', // Using as closest match for system job
        resource_type: 'system',
        resource_id: null,
        action_status: summary.success ? 'success' : 'failure',
        details: {
          job_type: 'scheduled_cycle_check',
          ...summary
        }
      })

    // Return summary response
    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Scheduled cycle check error:', error)
    
    const errorResponse: CycleCheckResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      cycles_checked: 0,
      cycles_marked_overdue: 0,
      cycles_failed: 0,
      vendors_scored: 0,
      vendors_score_failed: 0,
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
