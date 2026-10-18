// Supplier Verification Update Edge Function
// Admin endpoint to update verification status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin (verify role from JWT or users table)
    // For now, we'll check if user has an admin role in the database
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { supplierId, verificationStatus, rejectionReason, certificationUpdates } = body

    if (!supplierId || !verificationStatus) {
      return new Response(
        JSON.stringify({ error: 'supplierId and verificationStatus are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update supplier verification status
    const supplierUpdate: any = {
      verification_status: verificationStatus,
      status: verificationStatus === 'verified' ? 'approved' : 'rejected',
    }

    if (rejectionReason) {
      supplierUpdate.rejection_reason = rejectionReason
    }

    const { data: updatedSupplier, error: supplierError } = await supabase
      .from('suppliers')
      .update(supplierUpdate)
      .eq('id', supplierId)
      .select()
      .single()

    if (supplierError) {
      return new Response(
        JSON.stringify({ error: supplierError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update certifications if provided
    if (certificationUpdates && Array.isArray(certificationUpdates)) {
      for (const cert of certificationUpdates) {
        await supabase
          .from('supplier_certifications')
          .update({ verification_status: cert.verificationStatus })
          .eq('id', cert.certificationId)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        supplier: updatedSupplier 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
