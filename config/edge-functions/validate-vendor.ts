// Supabase Edge Function for server-side validation
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { vendor } = await req.json()

  // Server-side validation
  const errors = []
  if (!vendor.name || vendor.name.length < 2) errors.push('Invalid name')
  if (!vendor.phone || !/^\+?[\d\s-]{10,}$/.test(vendor.phone)) errors.push('Invalid phone')
  if (!vendor.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) errors.push('Invalid email')
  if (vendor.credit_limit && (vendor.credit_limit < 0 || vendor.credit_limit > 10000000)) errors.push('Invalid credit limit')

  if (errors.length > 0) {
    return new Response(JSON.stringify({ error: errors.join(', ') }), { status: 400 })
  }

  // Insert with RLS
  const { data, error } = await supabase.from('vendors').insert(vendor).select()

  return new Response(JSON.stringify({ data, error }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
