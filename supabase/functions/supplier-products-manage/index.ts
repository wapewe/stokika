// Supplier Products Management Edge Function
// CRUD operations for supplier_products (future dashboard feature)

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

    const url = new URL(req.url)

    // GET: List products for a supplier
    if (req.method === 'GET') {
      const supplierId = url.searchParams.get('supplier_id')
      
      if (!supplierId) {
        return new Response(
          JSON.stringify({ error: 'supplier_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify ownership
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', supplierId)
        .eq('user_id', user.id)
        .single()

      if (!supplier) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: products, error } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ products }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST: Create a product
    if (req.method === 'POST') {
      const body = await req.json()
      
      // Verify ownership
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', body.supplier_id)
        .eq('user_id', user.id)
        .single()

      if (!supplier) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: product, error } = await supabase
        .from('supplier_products')
        .insert(body)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ product }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT: Update a product
    if (req.method === 'PUT') {
      const body = await req.json()
      const productId = body.id

      if (!productId) {
        return new Response(
          JSON.stringify({ error: 'Product ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify ownership through product -> supplier -> user
      const { data: product } = await supabase
        .from('supplier_products')
        .select('supplier_id, suppliers!inner(user_id)')
        .eq('id', productId)
        .single()

      if (!product || (product as any).suppliers.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: updatedProduct, error } = await supabase
        .from('supplier_products')
        .update(body)
        .eq('id', productId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ product: updatedProduct }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE: Delete a product
    if (req.method === 'DELETE') {
      const productId = url.searchParams.get('id')

      if (!productId) {
        return new Response(
          JSON.stringify({ error: 'Product ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify ownership
      const { data: product } = await supabase
        .from('supplier_products')
        .select('supplier_id, suppliers!inner(user_id)')
        .eq('id', productId)
        .single()

      if (!product || (product as any).suppliers.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('supplier_products')
        .delete()
        .eq('id', productId)

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
